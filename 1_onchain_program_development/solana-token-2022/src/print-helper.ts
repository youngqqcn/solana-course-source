import { PublicKey } from '@solana/web3.js'

function printTableData(obj: Object) {
	let tableData: any = []

	const formatPublicKey = (key: PublicKey) => `${key.toBase58().substring(0, 4)}...${key.toBase58().slice(-4)}`;

	const processObject = (currentValue: any) => {
		Object.keys(currentValue).forEach((key) => {
			let value = currentValue[key];
			if (value instanceof PublicKey) {
				value = formatPublicKey(value);
			} else if (value instanceof Object) {
				value = processObject(value); // Recursively format nested objects
			}
			currentValue[key] = value;
		});
		return currentValue;
	};

	if (Array.isArray(obj)) {
		obj.forEach((item) => {
			tableData.push(processObject({ ...item }));
		});
	} else {
		tableData.push(processObject({ ...obj }));
	}

	console.table(tableData);
	console.log();
}

export default printTableData