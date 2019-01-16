# Satchel Alpha

Satchel is a standardjs compliant, light-weight in-browser [Bitcoin SV](https://www.bitcoinsv.org/) wallet library. It it is designed to speed up development of new Bitcoin apps without having UI opinions. It is in essence a collection of convenience functions that work together to perform common wallet actions like importing private keys, making transactions, cleaning up UTXOs, and monitoring Bitcoin network actiity. It uses bitsocket to monitor the logged in address, and triggers a callback to your application when related activity is seen on the network. It does not require you to run a bitcoin node or any other software. To keep things simple, it omits support for the CashAddr address format. If you need cash address support, there is a simple conversion library you can use in conjunction with this one called `bchaddrjs`.

#### Thanks to the following projects which made this possible

- https://bitgraph.network
- https://bitsocket.org
- https://bitcore.io
- https://github.com/bitcoinjs/bip39
- https://github.com/dawsbot/satoshi-bitcoin
- https://github.com/soldair/node-qrcode

## Prerequisites

You must have `make` installed to automate building. 


#### Development

```bash
nvm use node
npm install -g browserify
npm install -g uglify-es
npm install
make
```


#### Release

```bash
make release
```

#### Linting

```bash
make lint
```

#importing

```vue
import Satchel from 'bsv-satchel'
Vue.use(Satchel)
```

```html
<script src="/node_modules/bsv-satchel/dist/satchel.min.js">
access from window.satchel
```

#### Examples

See `https://blockday.cash` and `https://dtv.cash` for an examples of applications using Satchel. 


## Methods


#### `satchel.init(options: object, callback: function)`
Initializes the wallet and attaches it to the page. 


##### Options

| option | description | required | type | default|
|--------|-------------|----------|------|--------|
| bitdb_token | Grab this from https://bitdb.network/v3/dashboard | :heavy_check_mark: | string | |
| bitdb_url | Modify this if you are running custom bitdb instance.  | |string |  https://bitgraph.network/q/ |
| bitsocket_url | Modify this if you are running custom bitsocket instance.  | |string |  https://bitsocket.network/q/ |
| bitbox_url | Modify this if you are running custom bitbox instance. | |string |  https://rest.bitbox.earth/v1/ |
| fee_per_kb | Satoshis per kilobyte for fee. |  | integer |  1000 |
| transaction_received_pane_time | How long to show the received pane in milliseconds. |  | integer |  4800 |
| transaction_sent_pane_time | How long to show the sent pane in milliseconds. |  | integer |  4800 |
| rpc | What rpc service to use for sending transactions. | | string |  https://bchsvexplorer.io |
| max_utxos | The maximum number of utxos to return when calling get_utxos(). Will return utxos with highest value. | integer | 5 |
| update_actions_query | Data to query bitdb with when update_actions is called. | | function | `() => find_all_inputs_and_outputs(satchel.get_address_suffix(), 100);` |
| bitsocket_listener | This creates a bitsocket on login and closes on delete. Used for watching new transactions. Set to `null` if you don't want it to run. | | function | `() => {} -> EventSource (see code) ` |
| on_receive_callback | Called when the logged in address receives a tx. | | function | `(data) => {}` |


##### Example

```js
satchel.init({
    'bitdb_token': 'bitdb_api_key_goes_here',
    'fee_per_kb': 1337
}, walletLoaded)
```

#### `satchel.get_address() -> bsv.Address()`
Retrieves the Address object associated with logged in user.

##### Example

```js

satchel.get_address().network.name == 'livenet'
```

#### `satchel.get_address_str() -> string`
Retrieves the string representation of the logged in address. This could be used to look up on an explorer website. 

##### Example
```js

satchel.get_address_str() == '1....'
```

#### `satchel.get_wif() -> string`
Retrieves the "Wallet import format" of a private key. This is stored in localStorage to be able to perform actions on behalf of an address. It is a base58 encoded representation of a double sha-256'd extended key, with a checksum and network type included.

##### Example
```js

console.log(`don't share this with anyone: ${satchel.get_wif()}`)
```

#### `satchel.get_balance() -> integer`
Retrieves the amount of satoshis that are confirmed for the user. You might want to combine this and the unconfirmed balance to get the "full" balance, but this depends on the application.

##### Example
```js

if (satchel.get_balance() > 100000000) {
    console.log('you have at least 1 bitcoin')
}
```

#### `satchel.get_unconfirmed_balance() -> integer`
Retrieves the amount of satoshis that are unconfirmed for the user.

##### Example
```js

if (satchel.get_unconfirmed_balance() == 0) {
    console.log('you have no unconfirmed bitcoin')
}
```

#### `satchel.get_utxos(int max) -> [object]`
Retrieves the utxo set associated with an address. This is used for sending transactions. By default all utxos are used as inputs, up to a maximum of 5 to prevent very large transactions that may fail to broadcast on wallets with a high number of utxos. You may provide an optional maximum number of utxos to consume. Passing null will use all of them regardless of tx size.

##### Example
```js

for (const utxo of satchel.get_utxos()) {
    console.log(utxo['txid'])
}
```

#### `satchel.get_private_key() -> bsv.PrivateKey()`
Retrieves the private key of a logged in address. This imports the WIF stored in localStorage.

##### Example
```js

if (satchel.get_private_key().publicKey.compressed) {
    console.log('your public key is compressed')
}
```

#### `satchel.is_logged_in() -> boolean`
Checks if currently logged in.

##### Example
```js

if (! satchel.is_logged_in()) {
    console.log('not logged in')
}
```

#### `satchel.send(address: bsv.Address, satoshis: integer, callback: (tx) => {})`
Performs a basic transaction: to send N satoshis to an address. A callback may be provided in order to perform additional processing after the broadcast has completed.

##### Example
```js

const address = satchel.bsv.Address.fromString('1...')
const sats = 2000
satchel.send(address, sats, (tx) => {
    console.log('transaction sent')
    console.log(tx)
})

```

#### `satchel.clean_tx_dust(tx: bsv.Transaction) -> bsv.Transaction`
Removes all outputs with more than 0 and less than 546 satoshis. This is a protocol limit.

##### Example
```js

let tx = new satchel.bsv.Transaction()
tx.from(satchel.get_utxos())
tx = satchel.clean_tx_dust(tx)

```

#### `satchel.add_op_return_data(tx: bsv.Transaction, data: [object]) -> bsv.Transaction

Adds one or more `OP_RETURN` data points. If you use this, make sure that when you call `satchel.broadcast_tx` you set safe to false as currently `bsv` doesn't like the multiple `OP_RETURN` arguments. 

To use this pass an array containing `type` and `v`. `type` may be either `hex` or `str`.

##### Example
```js

let tx = new satchel.bsv.Transaction()
tx.from(satchel.get_utxos())
tx = satchel.add_op_return_data(tx, [
    {'type': 'hex', 'v': '6d01'},
    {'type': 'str', 'v': 'testing testing'},
])

```

#### `satchel.broadcast_tx(tx: bsv.Transaction, callback: (tx) => {}, safe: boolean = true)`
Sends a transaction off to the network. This uses the `satchel.rpc` option to choose a server. It sends the serialized form of a transaction to a bitcoin node. A callback may be provided in order to perform additional processing after the broadcast has completed. `send` uses this internally to actually broadcast the transaction. The `safe` parameter is used to choose between safe serialization or just conversion to string. In case of using OP_RETURN you must disable safe mode, and therefore bitcore-lib-cash will not give an error on broadcast.

##### Example
```js

const address = satchel.bsv.Address.fromString('1....')
const sats = 2000

let tx = new satchel.bsv.Transaction()
tx.from(satchel.get_utxos())
tx.to(address, sats)
tx.feePerKb(satchel.fee_per_kb)
tx.change(satchel.get_address())
tx = satchel.clean_tx_dust(tx)
tx.sign(satchel.get_private_key())

satchel.broadcast_tx(tx, (tx) => {
    console.log('transaction broadcast')
    console.log(tx)
});
```

#### `satchel.before(method: string, callback: (...) => {})`
Registers a call to perform prior to performing a satchel method. The valid method options are:

- `'generate_qr_code', (address: bsv.Address) => {}`
- `'login', (wif: string) => {}`
- `'logout', () => {}`
- `'send', (address: bsv.Address, satoshis: integer) => {}`
- `'broadcast_tx'`, (tx: bsv.Transaction) => {}
- `'update_balance'`, () => {}
- `'update_utxos'`, () => {}
- `'update_actions'`, () => {}


##### Example
```js

satchel.before('send', (address, satoshis) => {
    console.log('sending ${satoshis} to ${address}')
})
```

#### satchel.after(method: string, callback: (...) => {})
Registers a call to perform after performing a satchel method. The valid method options are:

- `'generate_qr_code', (address: bsv.Address, qr: qrcode) => {}`
- `'login', (wif: string) => {}`
- `'logout', () => {}`
- `'send', (address: bsv.Address, satoshis: integer, tx: bsv.Transaction) => {}`
- `'broadcast_tx'`, (tx: bsv.Transaction) => {}
- `'update_balance'`, () => {}
- `'update_utxos'`, (utxos: [object]) => {}
- `'update_actions'`, () => {}

##### Example
```js

satchel.after('login', (wif) => {
    sound_controller.play_clip('hello.mp3')
})
```

#### `satchel.update_balance(callback: (data) => {})`

Retrieves the logged in addresses balance and updates localStorage, these values are set:

- `satchel-wallet.balance`
- `satchel-wallet.unconfirmed-balance`
- `satchel-wallet.total-sent`
- `satchel-wallet.total-received`

And the callback receives the json from bitbox.

##### Example
```js

satchel.update_balance((data) => {
    console.log('new balance is ${satchel.get_balance()}')
});
```

#### `satchel.update_utxos(callback: (data) => {})`
Retrieves the utxo set for the logged in address. The callback contains the json from bitbox. 

##### Example
```js

satchel.update_utxos((data) => {
    console.log('you have ${satchel.get_utxos().length} utxos')
});
```

#### `satchel.update_actions(callback: (data) => {})`
Retrieves the transactions involving an address and displays them in the actions pane. 

##### Example
```js

satchel.update_actions(() => {
    console.log('actions updated')
});

```

#### `satchel.query_bitdb(query: object, callback: (data: object) => {})`
Performs a query on the bitdb database which results in a Json object.
Find documentation for this at https://bitdb.network/ 

##### Example
```js
const test_query = (addr) => ({
  'v': 3,
  'q': {
      'find': {
          'in.e.a':  addr
      },
      'limit': 10
  },
  'r': {
      'f': '[ .[] | { block: .blk.i?, timestamp: .blk.t?, content: .out[1]?.s2 }]'
  }
})

satchel.query_bitdb(test_query(satchel.get_address_str()), (r) => {
  console.log(r)
},(err) => {
  console.error("Failed to query BitDB", err)
})

```

#### `satchel.login(wif: string, callback: () => {})`
Logs in with WIF string. For normal operation you will not need to call this yourself.

##### Example
```js

const wif = '...';
satchel.login(wif, () => {
    // do some html stuff or something here, will run after localStorage is updated.
    console.log('logged in')
})
```

#### `satchel.logout(callback: () => {})`
Logs out. With normal operation you will not need to call this yourself. This is called when the logout button is clicked.

##### Example
```js

satchel.logout(() => {
    console.log('logged out')
})
```

## Helpers

#### `satchel.sat2bch(sat: integer) -> string`

Gets the bch value of some satoshis like 13370000. Use this because Javascripts number handling will introduce small errors otherwise.

#### `satchel.bch2sat(bch: string) -> integer`

Gets the satoshis of a bch amount like 0.1337. Use this because Javascripts number handling will introduce small errors otherwise.

#### `satchel.receive_address_link_url_mapper(address)`

Generates link href for a bchsvexplorer.com address.

#### `satchel.tx_link_url_mapper(txid)`

Generates link href for a bchsvexplorer.com tx.


## Special

#### `satchel.bsv`
You may access the `bsv` library with `satchel.bsv`. See an example of this in `satchel.broadcast_tx`. You can see more examples and documentation over at https://github.com/moneybutton/bsv
