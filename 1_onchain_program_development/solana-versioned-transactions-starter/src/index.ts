import { initializeKeypair } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";

async function main() {
    // Connect to the devnet cluster
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

    const rentExemptionAmount =
        await connection.getMinimumBalanceForRentExemption(0);
    console.log("rentExemptionAmount: ", rentExemptionAmount);

    // console.log("等待开始");
    // await waitForNewBlock(connection, 100);
    // console.log("等待结束");
    // return;

    // Initialize the user's keypair
    const user = await initializeKeypair(connection);
    console.log("PublicKey:", user.publicKey.toBase58());

    // 如果不使用LookupTable, 每笔交易最多 22个地址左右 (不超过 1232字节)
    // 如果使用 LookupTable ，每次最多添加 30个地址，
    // 在本例子中, 使用LooupTable的情况下，一笔交易能够包含的账户是 57个 (每个账户占 18字节)
    const recipients = [];
    for (let i = 0; i < 57; i++) {
        recipients.push(web3.Keypair.generate().publicKey);
    }

    // 将22个地址放到 Lookup Table 账户中
    let lookupTableAddress = await initializeLookupTable(
        user,
        connection,
        recipients
    );
    // 等待 100 * 300 , 30秒？
    await waitForNewBlock(connection, 1);

    const lookupTableAccount = (
        await connection.getAddressLookupTable(lookupTableAddress)
    ).value;

    if (!lookupTableAccount) {
        throw new Error("lookup table not found: " + lookupTableAddress);
    }

    // Create an array of transfer instructions
    const transferInstructions = [];

    // Add a transfer instruction for each address
    for (const address of recipients) {
        transferInstructions.push(
            web3.SystemProgram.transfer({
                fromPubkey: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
                toPubkey: address, // The destination account for the transfer
                lamports: rentExemptionAmount, // The amount of lamports to transfer
            })
        );
    }

    const txid = await sendV0Transaction(
        connection,
        user,
        transferInstructions,
        [lookupTableAccount]
    );

    // 成功示例:
    //  创建 LookupTable Account: https://explorer.solana.com/tx/4FEn1TXuK7NYY1yymFtJHRhmGB9qDJj8PQDk1bwLXDq1wTkJ2BW7MhZKA8CC49PQu71UwYJZwQ8qDmMsNgxDLZhb?cluster=devnet
    // 使用 LookupTable Account交易: https://explorer.solana.com/tx/FAqwza1hAm23x75fTuXsMya6Z5QzVyMffMkiFPbtacrnPZnQ5i6jML3JVB6Te3wNmK2qSSfXA4sBjgPX9pM4Jof?cluster=devnet
    //
    // 57 个地址: https://explorer.solana.com/tx/4371K2NAkRYpEuHpEzwHxnLnDrvA15hAHvmoANxBAdgxxdYEA6wJeZFKQHSpcG36xBpaBuf78K8wXZ7LgxzN9E8u?cluster=devnet
}

async function sendV0Transaction(
    connection: web3.Connection,
    sender: web3.Keypair,
    instructions: web3.TransactionInstruction[],
    lookupTableAccounts?: web3.AddressLookupTableAccount[]
): Promise<web3.TransactionSignature> {
    const { lastValidBlockHeight, blockhash } =
        await connection.getLatestBlockhash();
    const messageV0 = new web3.TransactionMessage({
        payerKey: sender.publicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
    }).compileToV0Message(
        lookupTableAccounts ? lookupTableAccounts : undefined
    );

    const transaction = new web3.VersionedTransaction(messageV0);

    console.log(
        "============ 交易大小: ",
        transaction.serialize().buffer.byteLength
    );
    transaction.sign([sender]);

    const txSize = transaction.serialize().byteLength;
    if (txSize > 1232) {
        throw new Error("交易超过 1232字节");
    }

    const txid = await connection.sendTransaction(transaction);
    // Confirm the transaction
    await connection.confirmTransaction(
        {
            blockhash: blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
            signature: txid,
        },
        "finalized"
    );
    // Log the transaction URL on the Solana Explorer
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

    return txid;
}

async function waitForNewBlock(connection: web3.Connection, target: number) {
    return new Promise(async (finish: any) => {
        const { lastValidBlockHeight } = await connection.getLatestBlockhash(
            "finalized"
        );
        const intervalId = setInterval(async () => {
            const { lastValidBlockHeight: newBlockHeight } =
                await connection.getLatestBlockhash("finalized");
            if (newBlockHeight - lastValidBlockHeight > target) {
                clearInterval(intervalId);
                finish(); // 结束promise
            }
        }, 1000);
    });
}

async function initializeLookupTable(
    user: web3.Keypair,
    connection: web3.Connection,
    addresses: web3.PublicKey[]
): Promise<web3.PublicKey> {
    const slot = await connection.getSlot();

    // 创建 instruction 获取地址
    const [lookupTableTransactionIx, lookupTableAddress] =
        web3.AddressLookupTableProgram.createLookupTable({
            authority: user.publicKey,
            payer: user.publicKey,
            recentSlot: slot - 1,
        });
    const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
        payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
        authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
        lookupTable: lookupTableAddress, // The address of the lookup table to extend
        addresses: addresses.slice(0, 30), // The addresses to add to the lookup table
    });

    console.log("lookup table address: ", lookupTableAddress.toBase58());
    await sendV0Transaction(connection, user, [
        lookupTableTransactionIx,
        extendInstruction,
    ]);


    var remaining = addresses.slice(30);
    while (remaining.length > 0) {
        const toAdd = remaining.slice(0, 30);
        remaining = remaining.slice(30);
        const extendInstruction =
            web3.AddressLookupTableProgram.extendLookupTable({
                payer: user.publicKey, // The payer (i.e., the account that will pay for the transaction fees)
                authority: user.publicKey, // The authority (i.e., the account with permission to modify the lookup table)
                lookupTable: lookupTableAddress, // The address of the lookup table to extend
                addresses: toAdd, // The addresses to add to the lookup table
            });

        await sendV0Transaction(connection, user, [extendInstruction]);
    }

    return lookupTableAddress;
}

main()
    .then(() => {
        console.log("Finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
