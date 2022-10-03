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

## File requirements
1) The file must be in `.csv` format
2) As for now, there will be only **1 column** with recipient wallet addresses
3) As for now, all addresses in a file will get the **exact equal amount**
4) Values for ***Amount*** and ***Token type*** is initialized inside [index.js in(line 144)](src/airdrop-ergo/index.js)


## References
[EIP-0012](https://github.com/ergoplatform/eips/pull/23) 

[Nautilus](https://github.com/capt-nemo429/nautilus-wallet)

[Yoroi](https://github.com/Emurgo/yoroi-frontend)
