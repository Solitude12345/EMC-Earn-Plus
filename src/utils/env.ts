export type NODE_ENV_TYPE = "production"

export const environment:NODE_ENV_TYPE = "production";

export const environmentConfig = {
  production: {
    baseRequestUrl: "https://earn.emc.network"
  }
}

export const currentBaseUrl = environmentConfig[environment].baseRequestUrl;