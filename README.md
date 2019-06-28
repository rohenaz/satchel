<div style="width:100%;">
  <div style="max-width:140px; margin: auto;">
    <img src="https://raw.github.com/rohenaz/satchel/master/satchel.svg?sanitize=true" alt="Satchel">
  </div>
</div>

# Satchel Beta

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)



Satchel is a light-weight in-browser [Bitcoin SV](https://www.bitcoinsv.org/) headless HD wallet. It it is designed to speed up development of new Bitcoin apps without enforcing any UI opinions. It is a collection of convenience functions that work together to perform common wallet actions like importing private keys, making transactions, cleaning up UTXOs, and monitoring Bitcoin network actiity. It uses bitsocket to monitor the logged in address tree, and triggers a callback to your application when related activity is seen on the network. It does not require you to run a bitcoin node or any other software.


## Dependencies

#### Services

- https://chronos.bitdb.network/ (socket)
- https://genesis.bitdb.network/ (tx history)
- https://bitindex.network/ (xpub monitor)

#### Node Packages

- https://github.com/moneybutton/bsv
- https://github.com/dawsbot/satoshi-bitcoin
- https://github.com/papnkukn/qrcode-svg
- https://github.com/lwsjs/local-web-server (dev)

## Prerequisites

You need npm or yarn installed. 

## Usage

````
yarn add bsv-satchel
````

##### Example

```html
<script src="/node_modules/bsv-satchel/dist/satchel.min.js">
```

Library will be available from window.satchel

```js
satchel.init({
    'bitIndexApiKey': 'BITINDEX_API_HERE',
    'planariaApiKey': 'PLANARIA_API_HERE',
    'feePerKb': 1337
})
```

## Build Source

##### Install

```bash
git clone https://github.com/rohenaz/satchel.git
cd satchel
yarn
```

##### Build

```bash
yarn build
```

##### Run Example

```bash
yarn serve
```

Then open your browser to http://localhost:8000/example/index.html

#### Live Demo

[DTV](https://dtv.cash)


## Methods


#### `satchel.init(options: object)`

```js
satchel.init({
    'planariaApiKey': 'PLANARIA_API_HERE',
    ...
})
```

Initializes the wallet and attaches it to the page. 


##### Options

| option | description | required | type | default|
|--------|-------------|----------|------|--------|
| bitIndexApiKey | Grab this from https://bitindex.network | :heavy_check_mark: | string | |
| planariaApiKey | Grab this from https://bitdb.network/v3/dashboard | :heavy_check_mark: | string | |
| planariaUrl | Modify this if you are running a custom Planaria.  | |string |  https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/ |
| bitsocketUrl | Modify this if you are running custom bitsocket instance.  | |string |  https://chronos.bitdb.network/s/1P6o45vqLdo6X8HRCZk8XuDsniURmXqiXo/ |
| feePerKb | Satoshis per kilobyte for fee. |  | integer |  1000 |
| rpc | What rpc service to use for sending transactions. | | string |  https://api.bitindex.network |
| maxUtxos | The maximum number of utxos to return when calling satchel.utxos(). Will return utxos with highest value. | integer | 5 |
| txsQuery | Data to query Planaria with when getHistory is called. | | function | `() => txsQuery()` |
| bitsocketListener | This creates a bitsocket on login and closes on delete. Used for watching new transactions. Set to `null` if you don't want it to run. | | function | `() => {} -> EventSource (see code) ` |

### `address() -> bsv.Address`

```js
satchel.address().toString() === 'livenet'
```

Retrieves the Address object associated with logged in user.

### `address().toString() -> string`

```js
satchel.address().toString() === '1....'
```

Retrieves the string representation of the logged in address. This could be used to look up on an explorer website. 


### `balance() -> integer`

```js

if (satchel.balance() > 100000000) {
    console.log('you have at least 1 Bitcoin')
}
```

Retrieves the amount of satoshis that are confirmed and unconfirmed combined.


### `confirmedBalance() -> integer`

```js

if (satchel.confirmedBalance() === 0) {
    console.log('you have no confirmed Bitcoin')
}
```

Retrieves the amount of satoshis that are confirmed for the account.


### `unconfirmedBalance() -> integer`

```js

if (satchel.unconfirmedBalance() === 0) {
    console.log('you have no unconfirmed Bitcoin')
}
```

Retrieves the amount of satoshis that are unconfirmed for the account.


### `utxos(int max) -> [object]`

```js

for (const utxo of satchel.utxos()) {
    console.log(utxo['txid'])
}
```

Retrieves the utxo set associated with an address. This is used for sending transactions. By default all utxos are used as inputs, up to a maximum of 5 to prevent very large transactions that may fail to broadcast on wallets with a high number of utxos. You may provide an optional maximum number of utxos to consume. Passing null will use all of them regardless of tx size.


### `privateKey() -> bsv.PrivateKey()`

```js

if (satchel.privateKey().publicKey.compressed) {
    console.log('your public key is compressed')
}
```

Retrieves the individual private key of the current address. For an extended key, use satchel.hdPrivateKey() instead.


### `isLoggedIn() -> boolean`
Checks if currently logged in.

```js

if (! satchel.isLoggedIn()) {
    console.log('not logged in')
}
```


### `send(address: bsv.Address, satoshis: integer: (tx) => {})`
Performs a basic transaction: to send N satoshis to an address.

```js

const address = satchel.bsv.Address.fromString('1...')
const sats = 2000
let tx = await satchel.send(address, sats)
console.log('transaction sent')
console.log(tx)

```


### `cleanTxDust(tx: bsv.Transaction) -> bsv.Transaction`
Removes all outputs with more than 0 and less than 546 satoshis. This is a protocol limit.

```js

let tx = new satchel.bsv.Transaction()
tx.from(satchel.utxos())
tx = satchel.cleanTxDust(tx)

```


### `addOpReturnData(tx: bsv.Transaction, data: [object]) -> bsv.Transaction

Adds one or more `OP_RETURN` data points.

To use this pass an array in [datapay](https://github.com/unwriter/datapay) format.

```js

let tx = new satchel.bsv.Transaction()
tx.from(satchel.utxos())
tx = satchel.addOpReturnData(tx, ['0x6d01', 'testing testing'])

```


### `broadcastTx(tx: bsv.Transaction, safe: boolean = true)`

```js
const address = satchel.bsv.Address.fromString('1....')
const sats = 2000

let tx = new satchel.bsv.Transaction()
tx.from(satchel.utxos())
tx.to(address, sats)
tx.feePerKb(satchel.feePerKb)
tx.change(satchel.address())
tx = satchel.cleanTxDust(tx)
// TODO - show lookup private key example instead
tx.sign(satchel.privateKey())

let response = await satchel.broadcastTx(tx)
console.log('transaction broadcast')
console.log(tx)
```


Sends a transaction off to the network. This uses the `satchel.rpc` option to choose a server. It sends the serialized form of a transaction to a bitcoin node. A callback may be provided in order to perform additional processing after the broadcast has completed. `send` uses this internally to actually broadcast the transaction. The `safe` parameter is used to choose between safe serialization or just conversion to string. In case of using OP_RETURN you must disable safe mode, and therefore bitcore-lib-cash will not give an error on broadcast.

### `updateBalance()`

```js
let balance = await satchel.updateBalance()
console.log('new balance is ${balance}')
```

Retrieves the logged in addresses balance and updates localStorage, these values are set:

- `satchel-wallet.confirmed-balance`
- `satchel-wallet.unconfirmed-balance`


#### `updateUtxos()`

```js
let data = await satchel.updateUtxos()
console.log('you have ${satchel.utxos().length} utxos')
```

Retrieves the utxo set for the logged in address. The callback contains the json response.


### `getHistory()`

```js
let response = await satchel.getHistory()
console.log('history retrieved', response)
```

Retrieves transaction history across address tree.


### `new() -> string`
Creates a new HD wallet and logs in with it. Returns the new mnemonic passphrase.

```js
let mnemonic = await satchel.new()
console.log('wallet created', mnemonic)
```


### `newDataTx(data: Array, address: string, satoshis: integer) -> txid: string`

```js
let tx = await satchel.newDataTx(['yourdata', 'goes', 'here', '0x123'])
console.log('Tx created and ready to broadcast:', tx.toString())
```

Creates a new bsv.Transaction object from datapay formatted array and signs it with the current child private key. Returns the Transaction object. Address and satoshis are optional inputs for creating a second output sending some BSV to the provided address.


### `next() -> object`

```js
let nextAddressObj = await satchel.next()
console.log('Next unused address:', nextAddressObj.address)
```

Gets the next unused address information from BitIndex. This includes the chain, num, and address. Sets `satchel.num` key in localStorage.


### `setMnemonicAnchor(a: Element)`

```html
  <a id="downloadLink" style="display:none">Download Mnemonic</a>
```

```js
let el = document.getElementById('downloadLink')
let nextAddressObj = await satchel.setMnemonicAnchor(el)
console.log('Now you can click the download link')
```

Takes an HTMLAnchorElement and sets the href and download attributes to turn it into a 'download mnemonic' link. When clicked, a .txt files is downloaded containing your mnemonic passphrase. It will also remove the 'style:none' css attribute, making the button visible only when a mnemonic is available to download.


### `queryPlanaria(query: object)`

```js
const testQuery = {
  'v': 3,
  'q': {
      'find': {
          'in.e.a':  satchel.address().toString()
      },
      'limit': 10
  },
  'r': {
      'f': '[ .[] | { block: .blk.i?, timestamp: .blk.t?, content: .out[1]?.s2 }]'
  }
}

let r
try {
  r = await satchel.queryPlanaria(testQuery)
  console.log(r)
} catch (e) {
  console.error("Failed to query Planaria", err)
}
```

Performs a query on the bitdb database which results in a JSON object.
Find documentation about this at https://bitdb.network/


### `login(xprv: string)`

```js
const xprv = 'xprv...';
await satchel.login(xprv)
// do some html stuff or something here, will run after localStorage is updated.
console.log('logged in')
```

Logs in with extended private key string. You will typically not need to call this yourself.


### `logout()`

```js
satchel.logout()
console.log('logged out')
```

Logs out. With normal operation you will not need to call this yourself. This is called when the logout button is clicked.


## Helpers

### `sat2bsv(sat: integer) -> string`

Gets the bsv value of some satoshis like 13370000. Use this because Javascripts number handling will introduce small errors otherwise.


### `bsv2sat(bsv: string) -> integer`

Gets the satoshis of a bsv amount like 0.1337. Use this because Javascripts number handling will introduce small errors otherwise.


### `receiveAddressLink(address)`

Generates link href for a bchsvexplorer.com address.


### `txLink(txid)`

Generates link href for a bchsvexplorer.com tx.


### `qrCode()`

```js
let svg = satchel.qrCode()
document.body.appendChild(svg)
```

Returns a QR Code for the current wallet address as an SVG tag.


## Library Access

##### `moneybutton/bsv`
Available at `satchel.bsv`.


##### `moneybutton/mnemonic`
Available at `satchel.Mnemonic`

##### `papnkukn/qrcode-svg`
Available at `satchel.qrcode`
