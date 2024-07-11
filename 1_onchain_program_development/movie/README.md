How to run locally
Install tools
Instructions on how to install Solana can be found here.

Install dependencies
Extract the zip file in your project's directory and run:

``
yarn
```

Build

```
cd program
cargo build-sbf
```

Start a local test validator
```
solana-test-validator
```
Test
```
yarn test
```
Run client
```
yarn client
```
Note You might need to adjust the client and test code to fully work in local Node environment since there are playground exclusive features, e.g. if you are using pg.wallets.myWallet, you'll need to manually load each keypair.
