
import * as viem from "viem";

function startsWith(hash, prefix, length) {
	const hexStringToByteArray = (hexString) => {
		return Buffer.from(hexString.startsWith('0x') ? hexString.slice(2) : hexString, 'hex');
	};
	const hashBytes = hexStringToByteArray(hash);
	const prefixBytes = hexStringToByteArray(prefix);
	for (let i = 0; i < length; i++) {
		if (hashBytes[i] !== prefixBytes[i]) {
			return false;
		}
	}
	return true;
}

function mine(minerAddress, difficulty, difficultyLength, currentChallenge) {
	let hash;
	let count = 0;
	let time = performance.now();
	while (true) {
		// random generate
		const randomBytes = crypto.getRandomValues(new Uint8Array(32));
		const random_value = viem.bytesToHex(randomBytes);
		const hashed_solution = viem.keccak256(viem.encodeAbiParameters(
			viem.parseAbiParameters('bytes32, bytes32, address'),
			[random_value, currentChallenge, minerAddress]
		));

		count++;
		if (startsWith(hashed_solution, difficulty, Number(difficultyLength))) {
			console.log({ difficulty, difficultyLength, count, hashed_solution, currentChallenge, random_value });
			hash = random_value;
			break;
		} else {
			if (count % 10000 === 0) {
				const costTime = ((performance.now() - time) / 1000).toFixed(3);
				// console.log(`calculate_hash ${count / 10000}w ${costTime}s`);
			}
		}
	}
	return hash;
}

self.onmessage = (event) => {
	const { miner, difficulty, difficultyLength, currentChallenge } = event.data;
	const result = mine(miner, difficulty, difficultyLength, currentChallenge);
	self.postMessage(result);
};