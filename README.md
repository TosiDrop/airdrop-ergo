# Ergo Airdrop

## Setup

**Firstly, if you have `nvm`**, just run

```
nvm use
```

**If you don't have `nvm`** you can download `node` manually from [here](https://nodejs.org) but you need to be careful the version matches the one specified in our `.nvmrc` file.

Next, install project-independent dependencies with
```
npm install
```

After that, inside [src](src) folder, there is an [airdrop-ergo](src/airdrop-ergo) directory, inside which you should also install project-independent dependencies:
```
cd src/airdrop-ergo
npm install
```

Finally, you will be able to launch the application using 
```
npm start
```


## References
[EIP-0012](https://github.com/ergoplatform/eips/pull/23) 

[Nautilus](https://github.com/capt-nemo429/nautilus-wallet)

[Yoroi](https://github.com/Emurgo/yoroi-frontend)
