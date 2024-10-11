
import { ipcRenderer } from 'electron';
import Docker, { ContainerInspectInfo, ImageInfo } from 'dockerode';
import fs from 'fs';
import path from 'path';
import { mkdirpSync } from "mkdirp";

export class DockerApi {

    public docker: Docker;
    constructor() {
        this.docker = new Docker({ host: 'localhost', port: 2375 });
    }

    public async checkLive(): Promise<boolean> {
        try {
            await this.docker.ping();
            return true;
        } catch (error) {
            console.error('Error pinging Docker:', (error as Error).message);
            return false;
        }
    }

    public async listImages(): Promise<ImageInfo[]> {
        try {
            const images = await this.docker.listImages();
            return images;
        } catch (error) {
            console.error('Error listing Docker images:', (error as Error).message);
            throw error;
        }
    }

    public async checkImageExists(imageName: string): Promise<boolean> {
        try {
            const images = await this.docker.listImages();
            return images.some((image) => image.RepoTags && image.RepoTags.includes(imageName));
        } catch (error) {
            console.error('Error checking if Docker image exists:', (error as Error).message);
            throw error;
        }
    }

    public async pullImage(imageName: string, addLog: (type: string, message: string, eventId?: string) => void): Promise<void> {
        try {
            await new Promise<void>((resolve, reject) => {
                this.docker.pull(imageName, (err: any, stream: any) => {
                    if (err) return reject(err);
                    this.docker.modem.followProgress(stream, onFinished, onProgress);

                    function onFinished(err: Error | null, output: any): void {
                        if (err) return reject(err);
                        resolve(output);
                    }

                    function onProgress(event: any): void {
                        console.log(event);
                        if (event.status == 'Downloading' || event.status == 'Extracting') {
                            addLog(event.status, `${event.id}-${event.status}：${event.progress}`, event.id)
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error pulling Docker image:', (error as Error).message);
            throw error;
        }
    }

    public async getContainerStatus(containerName: string): Promise<{ exists: boolean, status: string | null }> {
        try {
            const container = this.docker.getContainer(containerName);
            const data: ContainerInspectInfo = await container.inspect();
            return { exists: true, status: data.State.Status };
        } catch (error: any) {
            if (error.statusCode === 404) {
                return { exists: false, status: null };
            } else {
                console.error('Error inspecting Docker container:', (error as Error).message);
                throw error;
            }
        }
    }

    public async startContainer(imageName: string, containerName: string): Promise<Docker.Container> {
        try {
            const container = await this.docker.createContainer({
                Image: imageName,
                name: containerName,
            });
            await container.start();
            return container;
        } catch (error) {
            console.error('Error starting Docker container:', (error as Error).message);
            throw error;
        }
    }

    public async stopContainer(containerName: string): Promise<void> {
        const container = this.docker.getContainer(containerName);
        if (container) {
            try {
                await container.stop();
            } catch (error) {
                console.error('Error stopping Docker container:', (error as Error).message);
            }

            try {
                console.log('12312', container)
                await container.remove();
            } catch (error) {
                console.error('Error remove Docker container:', (error as Error).message);
                // throw error;
            }
        }
    }


    async checkTask(intervalSalt: string): Promise<boolean> {
        const userPath = await ipcRenderer.invoke('get-user-data-path');
        mkdirpSync(path.join(userPath, `/task/`));

        const paramFilePath = path.join(userPath, `/task/${intervalSalt}_in.json`);
        if (fs.existsSync(paramFilePath)) {
            const fileOutPath = path.join(userPath, `/task/${intervalSalt}_out.json`);
            if (!fs.existsSync(fileOutPath)) {
                return true;
            } else {
                console.log('File is exists. Skipping.', paramFilePath);
                return false;
            }
        } else {
            return true;
        }
    }
    // img_reward  contractAddress
    async newTask(seed: string, prompt: string, intervalSalt: string, address: string, containerName: string, modelName: string, contractAddress: string, docker_name: string) {

        const userPath = await ipcRenderer.invoke('get-user-data-path');
        const taskPath = path.join(userPath, `/task`);
        mkdirpSync(taskPath);

        const params = { seed, prompt, intervalSalt, address, modelName, contractAddress };
        const paramFilePath = path.join(userPath, `/task/${intervalSalt}_in.json`);
        fs.writeFileSync(paramFilePath, JSON.stringify(params), 'utf-8');

        const PARAM_JSON = `/task/${intervalSalt}_in.json`
        const containerConfig = {
            remove: true,
            name: containerName,
            Image: docker_name,
            Env: [
                'PARAM_JSON=' + PARAM_JSON,
                'intervalSalt=' + intervalSalt,
            ],
            HostConfig: {
                Binds: [`${taskPath}:/task`],
                DeviceRequests: [
                    {
                        Count: -1,
                        Driver: "nvidia",
                        Capabilities: [["gpu"]],
                    },
                ],
            }
        };

        const container = await this.docker.createContainer(containerConfig);

        await container.start();

        const output = await container.wait();
        console.log({ output });

        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true
        });

        logStream.on('data', (chunk) => {
            const output = chunk.toString().trim();
            console.log('logs: ' + output);
        });

        await container.remove();

        const outputPath = path.join(userPath, `/task/${intervalSalt}_out.json`);
        const data = fs.readFileSync(outputPath, 'utf8');
        const result = JSON.parse(data);
        console.log('Task completed, result:', result);
        return data;
    }
}

export const exposeDockerApi = () => {
    const dockerApi = new DockerApi();
    return {
        checkLive: async () => await dockerApi.checkLive(),
        listImages: async () => await dockerApi.listImages(),
        checkImageExists: async (imageName: string) => await dockerApi.checkImageExists(imageName),
        pullImage: async (imageName: string, addLog: (type: string, message: string, eventId?: string) => void) => await dockerApi.pullImage(imageName, addLog),
        getContainerStatus: async (containerName: string) => await dockerApi.getContainerStatus(containerName),
        startContainer: async (imageName: string, containerName: string) => await dockerApi.startContainer(imageName, containerName),
        stopContainer: async (containerName: string) => await dockerApi.stopContainer(containerName),
        newTask: async (seed: any, prompt: string, intervalSalt: any, address: string, containerName: string, modelName: string, contractAddress: string, dockerName: string) => {
            return await dockerApi.newTask(seed, prompt, intervalSalt, address, containerName, modelName, contractAddress, dockerName)
        },
        checkTask: async (intervalSalt: string,) => await dockerApi.checkTask(intervalSalt),
    }
}
