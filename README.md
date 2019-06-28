<div style="width:100%;">
  <div style="max-width:140px; margin: auto;">
    <img src="https://raw.github.com/rohenaz/satchel/master/satchel.svg?sanitize=true" alt="Satchel">
  </div>
</div>

# Satchel (Beta)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
 [![last commit](https://img.shields.io/github/last-commit/rohenaz/satchel.svg?style=flat)](https://github.com/rohenaz/satchel/commits/master)
[![version](https://img.shields.io/github/release-pre/rohenaz/satchel.svg?style=flat)](https://github.com/rohenaz/satchel/releases)
[![license](https://img.shields.io/badge/license-Open%20BSV-brightgreen.svg?style=flat)](/LICENSE)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat)](https://github.com/RichardLitt/standard-readme)

Satchel is a minimal [Bitcoin SV](https://www.bitcoinsv.org/) headless HD wallet for the web. It it is designed to speed up development of new Bitcoin apps without enforcing any UI opinions. It is a collection of convenience functions that work together to perform common wallet actions like importing private keys, making transactions, cleaning up UTXOs, and monitoring Bitcoin network activity. It uses bitsocket to monitor the logged in address tree, and triggers a callback to your application when related activity is seen on the network. It does not require you to run a bitcoin node or any other software. It relies on a few [external services](#services) to keep the size as low as possible.

## Table of Contents
- [Installation](#installation)
- [Documentation](#documentation)
- [Examples](#examples)
- [Code Standards](#code-standards)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [Dependencies](#dependencies)
- [License](#license)

## Installation

### Prerequisites
You need [npm](https://www.npmjs.com/) or [yarn](https://www.npmjs.com/package/yarn) installed.

On a mac you can use [homebrew](https://brew.sh/) to install the above prerequisites 

### Install
Clone the repo, cd into the folder and `yarn` (`npm install`)
```bash
$ git clone https://github.com/rohenaz/satchel.git
$ cd satchel
$ yarn
```  

### Build From Source
To generate a new satchel.min.js file, run the `yarn build` command (`npm run build`)
```bash
$ yarn build
``` 

### Run the Example
To launch the example via a [local-web-server](https://www.npmjs.com/package/local-web-server)

Then open your browser to http://localhost:8000/example/index.html
```bash
$ yarn serve
```

## Documentation

### Satchel: Options
Below are all the options available to configure satchel.

| option | description | required | type | default|
|--------|-------------|----------|------|--------|
| bitIndexApiKey | Grab this from [BitIndex](https://bitindex.network) | :heavy_check_mark: | string | 1DGD3... |
| planariaApiKey | Grab this from [BitDB](https://bitdb.network/v3/dashboard) | :heavy_check_mark: | string | 1XGGY... |
| planariaUrl | Modify this if you are running a custom Planaria.  | |string |  https://genesis.bitdb.network/q/1Fna... |
| bitsocketUrl | Modify this if you are running custom bitsocket instance.  | |string |  https://chronos.bitdb.network/s/1P6o.. |
| feePerKb | Satoshis per kilobyte for fee. |  | integer |  1000 |
| rpc | What rpc service to use for sending transactions. | | string |  https://api.bitindex.network |
| maxUtxos | The maximum number of utxos to return when calling satchel.utxos(). Will return utxos with highest value. |  | integer | 5 |
| txsQuery | Data to query Planaria with when getHistory is called. | | function | `() => txsQuery()` |
| bitsocketListener | This creates a bitsocket on login and closes on delete. Used for watching new transactions. Set to `null` if you don't want it to run. | | function | `() => {} -> EventSource (see code) ` |

### Satchel: Included Libraries
All the power from included libraries is at your finger tips:

[`moneybutton/bsv`](https://github.com/moneybutton/bsv) is available at `satchel.bsv`.

[`moneybutton/mnemonic`](https://github.com/moneybutton/bsv-mnemonic) is available at `satchel.Mnemonic`


### Satchel: Methods

#### `address() -> bsv.Address`
Retrieves the Address object associated with logged in user.
```js
satchel.address()
``` 

#### `address().toString() -> string`
Retrieves the string representation of the logged in address. This could be used to look up on an explorer website. 
```js
satchel.address().toString() === '1....'
```

#### `balance() -> integer`
Retrieves the amount of satoshis that are confirmed and unconfirmed combined.
```js
if (satchel.balance() > 100000000) {
    console.log('you have at least 1 Bitcoin')
}
```

#### `confirmedBalance() -> integer`
Retrieves the amount of satoshis that are confirmed for the account.
```js
if (satchel.confirmedBalance() === 0) {
    console.log('you have no confirmed Bitcoin')
}
```

#### `unconfirmedBalance() -> integer`
Retrieves the amount of satoshis that are unconfirmed for the account.
```js
if (satchel.unconfirmedBalance() === 0) {
    console.log('you have no unconfirmed Bitcoin')
}
```

#### `utxos(int max) -> [object]`
Retrieves the utxo set associated with an address. This is used for sending transactions. By default all utxos are used as inputs, up to a maximum of 5 to prevent very large transactions that may fail to broadcast on wallets with a high number of utxos. You may provide an optional maximum number of utxos to consume. Passing null will use all of them regardless of tx size.

```js
for (const utxo of satchel.utxos()) {
    console.log(utxo['txid'])
}
```

#### `privateKey() -> bsv.PrivateKey()`
Retrieves the individual private key of the current address. For an extended key, use satchel.hdPrivateKey() instead.

```js
if (satchel.privateKey().publicKey.compressed) {
    console.log('your public key is compressed')
}
```

#### `isLoggedIn() -> boolean`
Checks if currently logged in.
```js
if (! satchel.isLoggedIn()) {
    console.log('not logged in')
}
```

#### `send(address: bsv.Address, satoshis: integer: (tx) => {})`
Performs a basic transaction: to send N satoshis to an address.
```js
const address = satchel.bsv.Address.fromString('1...')
const sats = 2000
let tx = await satchel.send(address, sats)
console.log('transaction sent')
console.log(tx)
```

#### `cleanTxDust(tx: bsv.Transaction) -> bsv.Transaction`
Removes all outputs with more than 0 and less than 546 satoshis. This is a protocol limit.          
```js
let tx = new satchel.bsv.Transaction()
tx.from(satchel.utxos())
tx = satchel.cleanTxDust(tx)
```

#### `addOpReturnData(tx: bsv.Transaction, data: [object]) -> bsv.Transaction
Adds one or more `OP_RETURN` data points.

To use this pass an array in [datapay](https://github.com/unwriter/datapay) format.
```js
let tx = new satchel.bsv.Transaction()
tx.from(satchel.utxos())
tx = satchel.addOpReturnData(tx, ['0x6d01', 'testing testing'])
```

#### `broadcastTx(tx: bsv.Transaction, safe: boolean = true)`
Sends a transaction off to the network. This uses the `satchel.rpc` option to choose a server. It sends the serialized form of a transaction to a bitcoin node. A callback may be provided in order to perform additional processing after the broadcast has completed. `send` uses this internally to actually broadcast the transaction. The `safe` parameter is used to choose between safe serialization or just conversion to string. In case of using OP_RETURN you must disable safe mode, and therefore bitcore-lib-cash will not give an error on broadcast.

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

#### `updateBalance()`
Retrieves the logged in addresses balance and updates `localStorage`, these values are set:
- `satchel-wallet.confirmed-balance`
- `satchel-wallet.unconfirmed-balance`

```js
let balance = await satchel.updateBalance()
console.log('new balance is ', balance)
```

#### `updateUtxos()`
Retrieves the utxo set for the logged in address. The callback contains the json response.
```js
let data = await satchel.updateUtxos()
console.log('you have ${satchel.utxos().length} utxos', data)
```

#### `getHistory()`
Retrieves transaction history across address tree.
```js
let response = await satchel.getHistory()
console.log('history retrieved', response)
```

#### `new() -> string`
Creates a new HD wallet and logs in with it. Returns the new mnemonic passphrase.
```js
let mnemonic = await satchel.new()
console.log('wallet created', mnemonic)
```

#### `newDataTx(data: Array, address: string, satoshis: integer) -> txid: string`
Creates a new bsv.Transaction object from [datapay](https://github.com/unwriter/datapay) formatted array and signs it with the current child private key. Returns the Transaction object. Address and satoshis are optional inputs for creating a second output sending some BSV to the provided address.

```js
let tx = await satchel.newDataTx(['yourdata', 'goes', 'here', '0x123'])
console.log('Tx created and ready to broadcast:', tx.toString())
```

#### `next() -> object`
Gets the next unused address information from BitIndex. This includes the chain, num, and address. Sets `satchel.num` key in localStorage.

```js
let nextAddressObj = await satchel.next()
console.log('Next unused address:', nextAddressObj.address)
```

#### `setMnemonicAnchor(a: Element)`
Takes an HTMLAnchorElement and sets the href and download attributes to turn it into a 'download mnemonic' link. When clicked, a .txt file is downloaded containing your mnemonic passphrase. It will also remove the 'style:none' css attribute, making the button visible only when a mnemonic is available to download.

```html
  <a id="downloadLink" style="display:none;">Download Mnemonic</a>
```

```js
let el = document.getElementById('downloadLink')
let nextAddressObj = await satchel.setMnemonicAnchor(el)
console.log('Now you can click the download link', nextAddressObj)
```

#### `queryPlanaria(query: object)`
Performs a query on the [bitdb](https://bitdb.network/) database which results in a JSON object.
Find documentation about this at [https://bitdb.network/](https://bitdb.network/)

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

#### `login(xprv: string)`
Logs in with extended private key string. You will typically not need to call this yourself.

```js
const xprv = 'xprv...';
await satchel.login(xprv)
// do some html stuff or something here, will run after localStorage is updated.
console.log('logged in')
```

#### `logout()`
Logs out. With normal operation you will not need to call this yourself. This is called when the logout button is clicked.

```js
satchel.logout()
console.log('logged out')
```

#### `sat2bsv(sat: integer) -> string`
Gets the bsv value of some satoshis like 13370000. Use this because Javascript's number handling will introduce small errors otherwise.
```js
let bitcoin = satchel.sat2bsv(10000)
console.log('converted', bitcoin)
```

#### `bsv2sat(bsv: string) -> integer`
Gets the satoshis of a bsv amount like 0.1337. Use this because Javascript's number handling will introduce small errors otherwise.
```js
let satoshis = satchel.bsv2sat(1.22)
console.log('converted', satoshis)
```

#### `receiveAddressLink(address)`
Generates link href for a [Whats On-Chain](https://whatsonchain.com) url address.
```js
console.log(satchel.receiveAddressLink('1...'))
// logs out https://whatsonchain/address/1...
```

#### `txLink(txid)`
Generates link href for a [Whats On-Chain](https://whatsonchain.com) tx.
```js
console.log(satchel.txLink('tx...'))
// logs out https://whatsonchain/tx/tx...
```

#### `qrCode(size: integer, format: string)`
Returns a url to a qr-code for the current address.
```js
console.log(satchel.qrCode(300, 'svg'))
// logs out https://api.qrserver.com/v1/create-qr-code/?data=16cbuoPEy2LkfacZYA47wA1CvThRZTjzCX&size=300x300&format=svg
```


## Examples
View the working [example](example/index.html) code, or [run the example locally](#run-the-example)

### Live Demos
- [map.sv](https://map.sv/?affiliate=$satchmo) uses satchel for generating and broadcasting transactions
- [DTV](https://dtv.cash/?affiliate=$satchmo) uses satchel for their visitors wallet solution


## Code Standards
Always use the language's best practices!

## Usage
There are [examples](#examples) above using satchel in the wild.

### Usage: In a Website
1) Add satchel to your page
```html
<script src="/node_modules/bsv-satchel/dist/satchel.min.js">
```

2) Initialize satchel to get started
```js
satchel.init({
    'bitIndexApiKey': 'BITINDEX_API_HERE',
    'planariaApiKey': 'PLANARIA_API_HERE',
    'feePerKb': 1337
})
``` 

**Note:** the satchel library will be available from `window.satchel`

### Usage: As a Package
Use as an npm package
````bash
$ yarn add bsv-satchel
````

## Maintainers
[Satchmo](https://github.com/rohenaz) - [MrZ](https://github.com/mrz1836)

Support the development of this project and the [Satchel](https://github.com/rohenaz/satchel?affiliate=$satchmo) team 🙏

[![Donate](https://img.shields.io/badge/donate-bitcoin%20SV-brightgreen.svg)](http://handcash.to/$satchmo)

## Contributing
Feel free to dive in! [Open an issue](https://github.com/rohenaz/satchel/issues/new) or submit PRs.

## Dependencies
Satchel is powered by several 3rd-party services and public npm packages.

### 3rd-Party Services
- [Chronos](https://chronos.bitdb.network/) (socket)
- [Genesis](https://genesis.bitdb.network/) (tx history)
- [Planaria](https://planaria.network/) (planaria)
- [BitIndex](https://bitindex.network/) (xpub monitor)
- [QR Server](https://qrserver.com/) (qr codes)

### Node Packages
- [bsv](https://github.com/moneybutton/bsv) (bsv library)
- [satoshi-bitcoin](https://github.com/dawsbot/satoshi-bitcoin) (conversions)
- [qrcode-svg](https://github.com/papnkukn/qrcode-svg) (qr codes)
- [local-web-server](https://github.com/lwsjs/local-web-server) (dev)

## License
[![License](https://img.shields.io/badge/license-Open%20BSV-brightgreen.svg?style=flat)](/LICENSE)