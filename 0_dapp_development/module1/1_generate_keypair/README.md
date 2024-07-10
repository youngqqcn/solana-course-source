> https://www.soldev.app/course/intro-to-cryptography


`esrun` 可以用 `ts-node` 代替


测试地址: BoZErCBMUtUL85UbgXnbPN4aaxx8uBdJsFpT9Hn8Ru1N

SOL水龙头:
- 每天最多5 SOL: https://solfaucet.com/
- 每天最多5 SOL: https://faucet.solana.com/


包含metadata的token:
https://explorer.solana.com/address/BSUk5iZYhBkELheMe1fLj32rk3cqDxfEk9jeYZrA83X9/metadata?cluster=devnet


区块浏览器获取的信息是ipfs上的metadata:
https://ipfs.io/ipfs/QmYe66u9pPkDDFR64iRTWJni3vuWirobkb4BZvJmJmQxWx



https://github.com/solflare-wallet/utl-api


---

创建 Token Mint 需要手动计算租金（`createMint` 封装了计算豁免租金`getMinimumBalanceForRentExemptMint()`)

创建 ATA则不用手动计算租金, 程序自动计算了
