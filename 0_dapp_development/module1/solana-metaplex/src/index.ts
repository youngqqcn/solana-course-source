import { initializeKeypair } from "./initializeKeypair";
import {
    Connection,
    clusterApiUrl,
    PublicKey,
    Keypair,
    Signer,
} from "@solana/web3.js";
import {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
    NftWithToken,
} from "@metaplex-foundation/js";
import * as fs from "fs";
import {
    getExplorerLink,
    getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import dotenv from "dotenv";
dotenv.config();

interface NftData {
    name: string;
    symbol: string;
    description: string;
    sellerFeeBasisPoints: number;
    imageFile: string;
}

// example data for a new NFT
const nftData = {
    name: "Doge Punks",
    symbol: "DOGP",
    description: "This is token of dog punks",
    sellerFeeBasisPoints: 0,
    imageFile: "dog.png",
};

// example data for updating an existing NFT
const updateNftData = {
    name: "Doge Punks Plus",
    symbol: "DOGPP",
    description: "Dog punks plus version",
    sellerFeeBasisPoints: 100,
    imageFile: "success.png",
};

interface CollectionNftData {
    name: string;
    symbol: string;
    description: string;
    sellerFeeBasisPoints: number;
    imageFile: string;
    isCollection: boolean;
    collectionAuthority: Signer;
}

async function main() {
    // create a new connection to the cluster's API
    const connection = new Connection(clusterApiUrl("devnet"));

    const keypair = getKeypairFromEnvironment("SECRET_KEY");
    console.log(`publicKey: ${keypair.publicKey}`);

    // 获取空投，如果需要的话
    // initialize a keypair for the user
    //   const user = await initializeKeypair(connection)
    //   console.log("PublicKey:", user.publicKey.toBase58())

    // 创建metaplex
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(keypair))
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            })
        );

    // 上传 图片以及 metadata 到 metaplex
    const metadataUri = await uploadMetadata(metaplex, nftData);

    // 创建NFT
    // const nft = await createNft(metaplex, nftData, metadataUri);

    // 更新NFT metadata
    // const newMetadataUri = await uploadMetadata(metaplex, updateNftData);

    // // 更新NFT metadata
    // await updateNftMetadata(
    //     metaplex,
    //     newMetadataUri,
    //     new PublicKey("FuMvkuntVPaHTBVAz4tmPqBWRNRRhEAgKfbvXXkcLiaK")
    // );

    const collectionNftData = {
        name: "TestCollectionNFT",
        symbol: "TEST",
        description: "Test Description Collection",
        sellerFeeBasisPoints: 100,
        imageFile: "success.png",
        isCollection: true,
        collectionAuthority: keypair,
    };

    // 上传 NFT 合集的metadata
    const collectionMetadataUri = await uploadMetadata(
        metaplex,
        collectionNftData
    );

    // 创建NFT合集
    const collectionNft = await createCollectionNft(
        metaplex,
        collectionMetadataUri,
        collectionNftData
    );

    // 创建 nft, 并添加到合集
    const nft = await createNftToCollection(
        metaplex,
        nftData,
        metadataUri,
        collectionNft.mint.address
    );

    // await verfionCollection(metaplex);
}

async function uploadMetadata(
    metaplex: Metaplex,
    nftData: NftData
): Promise<string> {
    // 读取本地图片，转为 metaplex文件
    const imgBuffer = fs.readFileSync("src/" + nftData.imageFile);
    const imgFile = toMetaplexFile(imgBuffer, nftData.imageFile);
    //  将图片上传ipfs
    const imageUri = await metaplex.storage().upload(imgFile);
    console.log("image uri: ", imageUri);

    // 上传metadata数据
    const output = await metaplex.nfts().uploadMetadata({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
        image: imageUri,
    });

    console.log("output:", output);

    console.log("metadata uri: ", output.uri);
    return output.uri;
}

async function createNft(
    metaplex: Metaplex,
    nftData: NftData,
    uri: string
): Promise<NftWithToken> {
    const { nft } = await metaplex.nfts().create(
        {
            uri: uri,
            name: nftData.name,
            sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
            symbol: nftData.symbol,
        },
        {
            // 等最终确认
            commitment: "finalized",
        }
    );

    console.log("nft: ", nft);
    const link = getExplorerLink("address", nft.address.toString(), "devnet");
    console.log("nft link: ", link);

    return nft;
}

async function createNftToCollection(
    metaplex: Metaplex,
    nftData: NftData,
    uri: string,
    collectionMint: PublicKey
): Promise<NftWithToken> {
    const { nft } = await metaplex.nfts().create(
        {
            uri: uri,
            name: nftData.name,
            sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
            symbol: nftData.symbol,
            collection: collectionMint, // 添加到合集
        },
        {
            // 等最终确认
            commitment: "finalized",
        }
    );

    console.log("nft: ", nft);
    const link = getExplorerLink("address", nft.address.toString(), "devnet");
    console.log("nft link: ", link);

    // 验证合集
    console.log("验证合集");
    const { response } = await metaplex.nfts().verifyCollection({
        mintAddress: nft.mint.address,
        collectionMintAddress: collectionMint,
        isSizedCollection: true,
    });
    console.log("response: ", response);
    console.log(
        "verify tx : ",
        getExplorerLink("transaction", response.signature, "devnet")
    );

    return nft;
}

async function updateNftMetadata(
    metaplex: Metaplex,
    newMetadataUri: string,
    mintAddress: PublicKey
) {
    const nft = await metaplex.nfts().findByMint({
        mintAddress,
    });

    const { response } = await metaplex.nfts().update(
        {
            nftOrSft: nft,
            uri: newMetadataUri,
        },
        {
            commitment: "finalized",
        }
    );

    console.log("response: ", response);

    console.log("link: ", getExplorerLink("tx", response.signature, "devnet"));
}

async function createCollectionNft(
    metaplex: Metaplex,
    uri: string,
    data: CollectionNftData
): Promise<NftWithToken> {
    const { nft } = await metaplex.nfts().create(
        {
            uri: uri,
            name: data.name,
            sellerFeeBasisPoints: data.sellerFeeBasisPoints,
            symbol: data.symbol,
            isCollection: true,
            updateAuthority: data.collectionAuthority,
            mintAuthority: data.collectionAuthority,
        },
        {
            commitment: "finalized",
        }
    );

    console.log(
        "link: ",
        getExplorerLink("address", nft.address.toString(), "devnet")
    );

    return nft;
}

async function verfionCollection(metaplex: Metaplex) {
    // 验证合集
    console.log("验证合集");
    const { response } = await metaplex.nfts().verifyCollection({
        mintAddress: new PublicKey(
            "9uMZtref4SNNQQgzHaCuvhnk2KC5fTQ7Dv4YytUxHKKB"
        ),
        collectionMintAddress: new PublicKey(
            "D3tWhA3x9huqQZon5UtS5DFjRyr76WSBeXatYMERc6x2"
        ),
        isSizedCollection: true,
    });
    console.log("response: ", response);
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
