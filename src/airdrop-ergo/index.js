import * as wasm from "ergo-lib-wasm-browser";
import JSONBigInt from 'json-bigint';

const ergoAccessBtn = document.querySelector('#request-access')
const getBalance = document.querySelector('#get-balance')
const getUtxos = document.querySelector('#get-utxos')
const alertEl = document.querySelector('#alert')
const spinner = document.querySelector('#spinner')
const signTxContainer = document.querySelector('#sign-tx-container')
const readCSV = document.querySelector('#csvFile')

let accessGranted = false
let utxos


ergoAccessBtn.addEventListener('click', (e) => {
    toggleSpinner(true)
    ergo_request_read_access().then(access_granted => {
        if (access_granted) {
            accessGranted = true
            alertSuccess('You have access now')
        } else {
            accessGranted = false
            alertError('Wallet access denied')
        }
        toggleSpinner(false)
    })
})

getBalance.addEventListener('click', () => {
    if (!accessGranted) {
        alertError('Should request access first')
    } else {
        toggleSpinner(true)
        ergo.get_balance().then(function (balance) {
            toggleSpinner(false)
            console.log('mybalance ' + balance)
            alertSuccess(`Account Balance: ${balance}`)
        });
    }
})

getUtxos.addEventListener('click', () => {
    if (!accessGranted) {
        alertError('Should request access first')
        return
    }
    toggleSpinner(true)
    ergo.get_utxos().then(utxosResponse => {
        toggleSpinner(false)
        if (utxosResponse.length === 0) {
            alertWarrning('NO UTXOS')
        } else {
            utxos = utxosResponse
            alertSuccess(`Check the console`)
            alertEl.innerHTML = '<pre>' + JSON.stringify(utxosResponse, undefined, 2) + '</pre>'
        }
    })
})

function readSingleFile(evt) {
    var output = []
    var csv = []
    var f = evt.target.files[0];
    if (f) {
        var r = new FileReader();
        r.onload = function (e) {
            var contents = e.target.result;
            console.log("File Uploaded! name: " + f.name + "content: " + contents + "type: " + f.type + "size: " + f.size);
            var lines = contents.split("\n");
            for (var i = 0; i < lines.length; i++) {
                var stringWithoutLineBreaks = lines[i].replace(/(\r\n|\n|\r)/gm, "");//remove those line breaks
                //console.warn(lines[i])
                output.push(stringWithoutLineBreaks);
            }
            // output = "<table>" + output.join("") + "</table>";
            output.map(function (el) {
                if (el.length != 0) {
                    csv.push(el)
                }
            });
            //this is the program to output the csv length and the output
            console.log(csv.length);
            console.warn(output.length);


            //initializing send button for signing a tx after a file has uploaded
            signTxContainer.innerHTML += `
            <button id='send' type='submit' class='form-btn mt-3 btn btn-warning'>Send</button>  
    `
            const sendBtn = document.getElementById('send')

            if (!sendBtn) {
                alertError("Can't find the send button!!")
                signTxContainer.classList.add('d-none')
            } else {
                signTxContainer.classList.remove('d-none')
            }


            //check for available utxo
            async function getUtxos(amountToSend) {
                const fee = BigInt(wasm.TxBuilder.SUGGESTED_TX_FEE().as_i64().to_str());
                const fullAmountToSend = BigInt(1000) * amountToSend + fee;
                const utxos = await ergo.get_utxos(fullAmountToSend.toString());
                const filteredUtxos = [];
                for (const utxo of utxos) {
                    try {
                        await wasm.ErgoBox.from_json(JSONBigInt.stringify(utxo));
                        filteredUtxos.push(utxo);
                    } catch (e) {
                        console.error('[getUtxos] UTxO failed parsing:', utxo, e);
                    }
                }
                return filteredUtxos;
            }

            //process after clicking the send button
            sendBtn.addEventListener('click', async (e) => {

                alertInfo("Creating transaction");
                const creationHeight = 398959;
                const totalAmountToSend = BigInt(100000 * csv.length)  //total amount including all addresses
                const amountToSend = BigInt(100000);  //sending amount for one address

                const amountToSendBoxValue = wasm.BoxValue.from_i64(wasm.I64.from_str(totalAmountToSend.toString()));       //boxValue for total amount
                const amountToSendBoxValueForEach = wasm.BoxValue.from_i64(wasm.I64.from_str(amountToSend.toString()));     //boxValue for one-address amount

                const utxos = await getUtxos(totalAmountToSend);
                let utxosValue = utxos.reduce((acc, utxo) => acc += BigInt(utxo.value), BigInt(0));  //available utxo

                const changeValue = utxosValue - totalAmountToSend - BigInt(wasm.TxBuilder.SUGGESTED_TX_FEE().as_i64().to_str());   //this is our change value
                console.log('utxos: ', utxosValue)
                console.log('amount to send: ', amountToSend)
                console.log('total amount to send: ', totalAmountToSend)
                console.log(`${changeValue} | cv.ts() = ${changeValue.toString()}`);


                const changeValueBoxValue = wasm.BoxValue.from_i64(wasm.I64.from_str(changeValue.toString()));
                const changeAddr = await ergo.get_change_address();

                const selector = new wasm.SimpleBoxSelector();

                const neta = wasm.TokenId.from_str('472c3d4ecaa08fb7392ff041ee2e6af75f4a558810a74b28600549d5392810e8')  //NETA Token
                const totalAmount = 2000000000 * csv.length; //the total amount of tokens to send
                const tokenAmountFull = wasm.TokenAmount.from_i64(wasm.I64.from_str(totalAmount.toString()))
                const oneAddressAmount = 2000000000;      //amount of tokens to send for one address
                const tokenAmountForEach = wasm.TokenAmount.from_i64(wasm.I64.from_str(oneAddressAmount.toString()))

                const token = new wasm.Token(neta, tokenAmountFull);
                const tokens = new wasm.Tokens()
                tokens.add(token)       //initializing a token

                const boxSelection = selector.select(
                    wasm.ErgoBoxes.from_boxes_json(utxos),
                    wasm.BoxValue.from_i64(amountToSendBoxValue.as_i64().checked_add(wasm.TxBuilder.SUGGESTED_TX_FEE().as_i64())),
                    tokens);    //adding a token into box

                console.log(`boxes selected: ${boxSelection.boxes().len()}`);
                const outputCandidates = wasm.ErgoBoxCandidates.empty();

                try {
                    for (let i = 0; i < csv.length; i++) {
                        const candidate = new wasm.ErgoBoxCandidateBuilder(
                            amountToSendBoxValueForEach,
                            wasm.Contract.pay_to_address(wasm.Address.from_base58(output[i])),
                            creationHeight);
                        candidate.add_token(neta, tokenAmountForEach)   //including our created boxes into candidates for tx
                        outputCandidates.add(candidate.build());
                    }

                } catch (e) {
                    console.log(`building error: ${e}`);
                    throw e;
                }

                console.log(`utxosval: ${utxosValue.toString()}`);
                console.log(boxSelection)
                console.log(outputCandidates)
                console.log(creationHeight)
                console.log(wasm.BoxValue.SAFE_USER_MIN())

                const txBuilder = wasm.TxBuilder.new(
                    boxSelection,
                    outputCandidates,
                    creationHeight,
                    wasm.TxBuilder.SUGGESTED_TX_FEE(),
                    wasm.Address.from_base58(changeAddr),
                    wasm.BoxValue.SAFE_USER_MIN()); //building our tx

                const dataInputs = new wasm.DataInputs();
                txBuilder.set_data_inputs(dataInputs);
                const tx = parseJson(txBuilder.build().to_json());
                console.log(`tx: ${JSONBigInt.stringify(tx)}`);
                console.log(`original id: ${tx.id}`);
                const correctTx = parseJson(wasm.UnsignedTransaction.from_json(JSONBigInt.stringify(tx)).to_json());
                console.log(`correct tx: ${JSONBigInt.stringify(correctTx)}`);
                console.log(`new id: ${correctTx.id}`);
                correctTx.inputs = correctTx.inputs.map(box => {
                    console.log(`box: ${JSONBigInt.stringify(box)}`);
                    const fullBoxInfo = utxos.find(utxo => utxo.boxId === box.boxId);
                    return {
                        ...fullBoxInfo,
                        extension: {}
                    };
                });
                alertInfo("Awaiting transaction signing");
                console.log(`${JSONBigInt.stringify(correctTx)}`);

                async function signTx(txToBeSigned) {
                    try {
                        return await ergo.sign_tx(txToBeSigned);
                    } catch (err) {
                        const msg = `[signTx] Error: ${JSON.stringify(err)}`;
                        console.error(msg, err);
                        alertError(msg)
                        return null;
                    }
                }

                async function submitTx(txToBeSubmitted) {
                    try {
                        return await ergo.submit_tx(txToBeSubmitted);
                    } catch (err) {
                        const msg = `[submitTx] Error: ${JSON.stringify(err)}`;
                        console.error(msg, err);
                        alertError(msg)
                        return null;
                    }
                }

                async function processTx(txToBeProcessed) {
                    const msg = s => {
                        console.log('[processTx]', s);
                        alertInfo(s);
                    };
                    const signedTx = await signTx(txToBeProcessed);
                    if (!signedTx) {
                        console.log(`No signed tx`);
                        return null;
                    }
                    msg("Transaction signed - awaiting submission");
                    const txId = await submitTx(signedTx);
                    if (!txId) {
                        console.log(`No submotted tx ID`);
                        return null;
                    }
                    msg("Transaction submitted - thank you for your donation!");
                    return txId;
                }

                function displayTxId(txId) {
                    alertSuccess(`<a href="https://explorer.ergoplatform.com/en/transactions/${txId}" target='_blank'> Transaction on the explorer</a>`)
                }

                processTx(correctTx).then(txId => {
                    console.log('[txId]', txId);
                    if (txId) {
                        displayTxId(txId);
                    }
                });
            })
        }
        r.readAsText(f);

    } else {
        alert("Failed to load file");
    }
}

readCSV.addEventListener('change', readSingleFile)

if (typeof ergo_request_read_access === "undefined") {
    alertError("Ergo not found");
} else {
    console.log("Ergo found");
    window.addEventListener("ergo_wallet_disconnected", function (event) {
        alertError("Wallet Disconnect")
    });
}

function alertError(text) {
    alertEl.className = 'alert alert-danger'
    alertEl.innerHTML = text
}

function alertSuccess(text) {
    alertEl.className = 'alert alert-success'
    alertEl.innerHTML = text
}

function alertWarrning(text) {
    alertEl.className = 'alert alert-warning'
    alertEl.innerHTML = text
}

function alertInfo(text) {
    alertEl.className = 'alert alert-info'
    alertEl.innerHTML = text
}

function toggleSpinner(status) {
    if (status) {
        spinner.className = 'spinner-border'
        alertEl.className = 'd-none'
    } else {
        spinner.className = 'd-none'
    }
}

function parseJson(str) {
    let json = JSONBigInt.parse(str);
    return {
        id: json.id,
        inputs: json.inputs,
        dataInputs: json.dataInputs,
        outputs: json.outputs.map(output => ({
            boxId: output.boxId,
            value: output.value.toString(),
            ergoTree: output.ergoTree,
            assets: output.assets.map(asset => ({
                tokenId: asset.tokenId,
                amount: asset.amount.toString(),
            })),
            additionalRegisters: output.additionalRegisters,
            creationHeight: output.creationHeight,
            transactionId: output.transactionId,
            index: output.index
        })),
    };
}
