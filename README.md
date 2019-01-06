# Satchel Alpha

Satchel is an in-browser [Bitcoin SV](https://www.bitcoinsv.org/) wallet library which is designed to be embedded into web applications to speed up development of new blockchain apps. It does not require you to run a bitcoin node or any other software on your server, deploy and configure with just Javascript. 

Please note that this project is in development, has not been battle tested, and is not really designed for amounts of money you aren't ok with losing. There may be bugs or security issues with it. The codebase is intended to be small enough for you to audit yourself and determine if it is useful for your project.

#### Thanks to the following projects which made this possible

- https://bitgraph.network/
- https://bitsocket.org/
- https://bitcore.io/
- https://github.com/bitcoinjs/bip39
- https://github.com/dawsbot/satoshi-bitcoin/
- https://github.com/soldair/node-qrcode

## Building

I recommend you use nvm https://github.com/creationix/nvm

You must also have `make` installed to automate building. 


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

See `https://dailyconsensus.com` and `https://dtv.cash` for an examples of applications using Satchel. 


## Methods


#### `satchel.init(options: object)`
Initializes the wallet and attaches it to the page. 


##### Options

| option | description | required | type | default|
|--------|-------------|----------|------|--------|
| bitdb_token | Grab this from https://bitdb.network/v3/dashboard | :heavy_check_mark: | string | |
| append_to | Which element to append the wallet to | | string | body |
| bitdb_url | Modify this if you are running custom bitdb instance.  | |string |  https://fountainhead.cash/q/ |
| bitsocket_url | Modify this if you are running custom bitsocket instance.  | |string |  https://bitsocket.network/q/ |
| bitbox_url | Modify this if you are running custom bitbox instance. | |string |  https://rest.bitbox.earth/v1/ |
| fee_per_kb | Satoshis per kilobyte for fee. |  | integer |  1000 |
| transaction_received_pane_time | How long to show the received pane in milliseconds. |  | integer |  4800 |
| transaction_sent_pane_time | How long to show the sent pane in milliseconds. |  | integer |  4800 |
| rpc | What rpc service to use for sending transactions. | | string |  https://bsvexplorer.io |

| update_actions_query | Data to query bitdb with when update_actions is called. | | function | `() => find_all_inputs_and_outputs(satchel.get_address_suffix(), 100);` |
| default_bitsocket_listener | This creates a bitsocket on login and closes on delete. Used for watching new transactions. Set to `null` if you don't want it to run. | | function | `() => {} -> EventSource (see code) ` |


##### Example

```js
satchel.init({
    'bitdb_token': 'qp9rzh6levrrn5r5x4slc6q7qxhl452dty5nuyuq6m',
    'fee_per_kb': 1337
});
```

#### `satchel.get_address() -> bch.Address()`
Retrieves the Address object associated with logged in user.

##### Example

```js

satchel.get_address().network.name == 'livenet'
```

#### `satchel.get_address_str() -> string`
Retrieves the string representation of the logged in address. This could be used to look up on an explorer website. 

##### Example
```js

satchel.get_address_str() == 'bitcoincash:qz4xkn3wx9a04a6yvpkcz4lca5qdf0aslq50hy3v9g'
```

#### `satchel.get_address_suffix() -> string`
Retrieves the string representation of the logged in address for bitdb queries. It is the same as `get_address_str()` with the `bitcoincash:` prefix removed.

##### Example
```js

satchel.get_address_suffix() == 'qz4xkn3wx9a04a6yvpkcz4lca5qdf0aslq50hy3v9g'
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
    console.log('you have at least 1 bitcoin');
}
```

#### `satchel.get_unconfirmed_balance() -> integer`
Retrieves the amount of satoshis that are unconfirmed for the user.

##### Example
```js

if (satchel.get_unconfirmed_balance() == 0) {
    console.log('you have no unconfirmed bitcoin');
}
```

#### `satchel.get_utxos() -> [object]`
Retrieves the utxo set associated with an address. This is used for sending transactions. In the satchel implementation by default all utxos are used as inputs for the next send.

##### Example
```js

for (const utxo of satchel.get_utxos()) {
    console.log(utxo['txid']);
}
```

#### `satchel.get_private_key() -> bch.PrivateKey()`
Retrieves the private key of a logged in address. This imports the WIF stored in localStorage.

##### Example
```js

if (satchel.get_private_key().publicKey.compressed) {
    console.log('your public key is compressed');
}
```

#### `satchel.is_logged_in() -> boolean`
Checks if currently logged in.

##### Example
```js

if (! satchel.is_logged_in()) {
    console.log('not logged in');
}
```

#### `satchel.send(address: bch.Address, satoshis: integer, callback: (tx) => {})`
Performs a basic transaction: to send N satoshis to an address. A callback may be provided in order to perform additional processing after the broadcast has completed.

##### Example
```js

const address = satchel.bsv.Address.fromString('bitcoincash:qz4xkn3wx9a04a6yvpkcz4lca5qdf0aslq50hy3v9g');
const sats = 2000;
satchel.send(address, sats, (tx) => {
    console.log('transaction sent');
    console.log(tx);
});

```

#### `satchel.clean_tx_dust(tx: bch.Transaction) -> bch.Transaction`
Removes all outputs with more than 0 and less than 546 satoshis. This is a protocol limit.

##### Example
```js

let tx = new satchel.bsv.Transaction();
tx.from(satchel.get_utxos());
tx = satchel.clean_tx_dust(tx);

```

#### `satchel.add_op_return_data(tx: bch.Transaction, data: [object]) -> bch.Transaction

Adds one or more `OP_RETURN` data points. If you use this, make sure that when you call `satchel.broadcast_tx` you set safe to false as currently `bitcore-lib-cash` doesn't like the multiple `OP_RETURN` arguments. 

To use this pass an array containing `type` and `v`. `type` may be either `hex` or `str`.

##### Example
```js

let tx = new satchel.bsv.Transaction();
tx.from(satchel.get_utxos());
tx = satchel.add_op_return_data(tx, [
    {'type': 'hex', 'v': '6d01'},
    {'type': 'str', 'v': 'testing testing'},
]);

```

#### `satchel.broadcast_tx(tx: bch.Transaction, callback: (tx) => {}, safe: boolean = true)`
Sends a transaction off to the network. This uses the `satchel.rpc` option to choose a server. It sends the serialized form of a transaction to a bitcoin node. A callback may be provided in order to perform additional processing after the broadcast has completed. `send` uses this internally to actually broadcast the transaction. The `safe` parameter is used to choose between safe serialization or just conversion to string. In case of using OP_RETURN you must disable safe mode, and therefore bitcore-lib-cash will not give an error on broadcast.

##### Example
```js

const address = satchel.bsv.Address.fromString('bitcoincash:qz4xkn3wx9a04a6yvpkcz4lca5qdf0aslq50hy3v9g');
const sats = 2000;

let tx = new satchel.bsv.Transaction();
tx.from(satchel.get_utxos());
tx.to(address, sats);
tx.feePerKb(satchel.fee_per_kb);
tx.change(satchel.get_address());
tx = satchel.clean_tx_dust(tx);
tx.sign(satchel.get_private_key());

satchel.broadcast_tx(tx, (tx) => {
    console.log('transaction broadcast');
    console.log(tx);
});
```

#### `satchel.before(method: string, callback: (...) => {})`
Registers a call to perform prior to performing a satchel method. The valid method options are:

- `'generate_qr_code', (address: bch.Address) => {}`
- `'login', (wif: string) => {}`
- `'logout', () => {}`
- `'send', (address: bch.Address, satoshis: integer) => {}`
- `'broadcast_tx'`, (tx: bch.Transaction) => {}
- `'update_balance'`, () => {}
- `'update_utxos'`, () => {}
- `'update_actions'`, () => {}


##### Example
```js

satchel.before('send', (address, satoshis) => {
    console.log('sending ${satoshis} to ${address}');
});
```

#### satchel.after(method: string, callback: (...) => {})
Registers a call to perform after performing a satchel method. The valid method options are:

- `'generate_qr_code', (address: bch.Address, qr: qrcode) => {}`
- `'login', (wif: string) => {}`
- `'logout', () => {}`
- `'send', (address: bch.Address, satoshis: integer, tx: bch.Transaction) => {}`
- `'broadcast_tx'`, (tx: bch.Transaction) => {}
- `'update_balance'`, () => {}
- `'update_utxos'`, (utxos: [object]) => {}
- `'update_actions'`, () => {}

##### Example
```js

satchel.after('login', (wif) => {
    sound_controller.play_clip('login.wav');
});
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
    console.log('new balance is ${satchel.get_balance()}');
});
```

#### `satchel.update_utxos(callback: (data) => {})`
Retrieves the utxo set for the logged in address. The callback contains the json from bitbox. 

##### Example
```js

satchel.update_utxos((data) => {
    console.log('you have ${satchel.get_utxos().length} utxos');
});
```

#### `satchel.update_actions(callback: (data) => {})`
Retrieves the transactions involving an address and displays them in the actions pane. 

##### Example
```js

satchel.update_actions(() => {
    console.log('actions updated');
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
});

satchel.query_bitdb(test_query(satchel.get_address_str()), (r) => {
    console.log(r);
});

```

#### `satchel.login(wif: string, callback: () => {})`
Logs in with WIF string. For normal operation you will not need to call this yourself.

##### Example
```js

const wif = '...';
satchel.login(wif, () => {
    // do some html stuff or something here, will run after localStorage is updated.
    console.log('logged in');
});
```

#### `satchel.logout(callback: () => {})`
Logs out. With normal operation you will not need to call this yourself. This is called when the logout button is clicked.

##### Example
```js

satchel.logout(() => {
    console.log('logged out');
});
```

## Helpers

#### `satchel.sat2bch(sat: integer) -> string`

Gets the bch value of some satoshis like 13370000. Use this because Javascripts number handling will introduce small errors otherwise.

#### `satchel.bch2sat(bch: string) -> integer`

Gets the satoshis of a bch amount like 0.1337. Use this because Javascripts number handling will introduce small errors otherwise.

#### `satchel.receive_address_link_url_mapper(address)`

Generates link href for an explorer.bitcoin.com address.

#### `satchel.tx_link_url_mapper(txid)`

Generates link href for an explorer.bitcoin.com tx.


## Special

#### `satchel.bsv`
You may access the `bitcore-lib-cash` library with `satchel.bsv`. See an example of this in `satchel.broadcast_tx`. You can see more examples and documentation over at https://github.com/bitpay/bitcore-lib-cash 


#### `satchel.registered_actions_parsers`
This is an array of functions which take a transaction to run on each transaction which is the result of the `satchel.update_actions_query` in `satchel.update_actions`. The default implementation is to create the Sent and Received templates, but this can be removed and you can do some other processing. So for example, instead of sent and received templates you could have one for comments and posts, and then show something else for those types of transactions. 