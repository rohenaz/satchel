// Load the bsv package
const bsv = require('bsv')

// Load the mnemonic package
const Mnemonic = require('bsv/mnemonic')

const Message = require('bsv/message')

// Load the satoshi-bitcoin package
const sb = require('satoshi-bitcoin')

// Standard dust limit (minimum)
const dustLimit = 546

// Fee per kilobyte, used for calculating fees
const feePerKb = 1000

// Multiplier used for calculating estimated fees
const feeEstimatedMultiplier = 1.4

// BSV Explorer service provider
const explorerProvider = 'https://whatsonchain.com'

// QR Code service provider
const qrCodeProvider = 'https://api.qrserver.com/v1/'

const defaults = {
  fee: 500
}

// Initialize the application
const app = {
  Message: Message,
  bitIndexApiKey: '',
  bsv: bsv,
  feePerKb: feePerKb,
  mnemonic: Mnemonic,
  planariaApiKey: '',
  planariaUrl:
    'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/',
  rpc: 'https://api.bitindex.network',
  rpcXpub: 'https://api.allaboardbitcoin.com',
  updateDebounce: 10000,
  state: {},
  persistState: updatedState => {
    if (Object.keys(updatedState).length === 0) {
      clearFromLocalStorage(SATCHEL_STORAGE_KEY)
    } else {
      persistToLocalStorage(SATCHEL_STORAGE_KEY, updatedState)
    }
  },
  loadState: () => getFromLocalStorage(SATCHEL_STORAGE_KEY, {}),

  // This must be set to enable bitsocket
  bitsocketCallback: null,
  bitsocketUrl:
    'https://chronos.bitdb.network/s/1P6o45vqLdo6X8HRCZk8XuDsniURmXqiXo/',
  debug: false,
  socket: null
}

// localStorage standard keys for satchel
const SATCHEL_STORAGE_KEY = 'satchel'
const CONFIRMED_BALANCE_KEY = 'confirmedBalance'
const MNEMONIC_KEY = 'mnemonic'
const NUM_KEY = 'num'
const TIMESTAMP_KEY = 'timestamp'
const UNCONFIRMED_BALANCE_KEY = 'unconfirmedBalance'
const UTXOS_KEY = 'utxos'
const XPRIV_KEY = 'xpriv'
const XPUB_KEY = 'xpub'

// Persist data to localStorage
const persistToLocalStorage = (storageKey, data) => {
  if (window.localStorage) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (e) {
      console.error('Failed saving data to LocalStorage')
    }
  }
}

// Clear data to localStorage
const clearFromLocalStorage = storageKey => {
  if (window.localStorage) {
    try {
      window.localStorage.clearItem(storageKey)
    } catch (e) {
      console.error('Failed clearing data from LocalStorage')
    }
  }
}

// Get data from localStorage
const getFromLocalStorage = (storageKey, defaultData) => {
  let data = defaultData
  if (window.localStorage) {
    try {
      data = JSON.parse(window.localStorage.getItem(storageKey)) || defaultData
    } catch (e) {
      console.error('Failed to retrieve data to LocalStorage')
    }
  }
  return data
}

// Sleep - promise with a setTimeout()
const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// jsonHeader returns a header for JSON
const jsonHeader = () => ({
  accept: 'application/json',
  'content-type': 'application/json'
})

// bitindexHeader returns a header for bitindex with API key
const bitindexHeader = () => {
  let header = jsonHeader()
  header.api_key = app.bitIndexApiKey
  return header
}

// sat2bsv converts satoshis to bitcoin
app.sat2bsv = sat => sb.toBitcoin(sat)

// bsv2sat converts bitcoin to satoshis
app.bsv2sat = bsv => sb.toSatoshi(bsv) | 0

app.num = () => app.state[NUM_KEY] || 0

// receiveAddressLink sets the link to view the address via explorer
app.receiveAddressLink = address => explorerProvider + `/address/${address}`

// txLink sets the tx explorer link
app.txLink = txid => explorerProvider + `/tx/${txid}`

// changeAddress returns a bsv.Address
app.changeAddress = () => {
  let changeKey = app.lookupPrivateKey(1, app.num())
  return bsv.Address.fromPrivateKey(changeKey, 'livenet')
}

// address returns a bsv.Address
app.address = () => {
  let pubKey = app.publicKey()
  return bsv.Address.fromPublicKey(pubKey, 'livenet')
}

// balance returns the total balance (confirmed and unconfirmed)
app.balance = () => app.confirmedBalance() + app.unconfirmedBalance()

// confirmedBalance returns just the confirmed balance
app.confirmedBalance = () => app.state[CONFIRMED_BALANCE_KEY] || 0

// unconfirmedBalance returns just the unconfirmed balance
app.unconfirmedBalance = () => app.state[UNCONFIRMED_BALANCE_KEY] || 0

// hdPrivateKey gets a hd private key
app.hdPrivateKey = () => new bsv.HDPrivateKey.fromString(app.xPriv())

// hdPublicKey gets a hd xpub key
app.hdPublicKey = () => new bsv.HDPrivateKey.fromString(app.xPub())

// mnemonic returns the local mnemonic
app.mnemonic = () => app.state[MNEMONIC_KEY]

// timestamp returns the local stored timestamp
app.timestamp = () => app.state[TIMESTAMP_KEY]

// xPriv returns the local stored xpriv
app.xPriv = () => app.state[XPRIV_KEY]

// xPub returns the local stored xpub
app.xPub = () => app.state[XPUB_KEY]

// privateKey returns the current private key
app.privateKey = () => {
  // Get derived HD number
  let num = app.num()

  // If we don't have one, ask BitIndex
  if (!num || num.length === 0) {
    // if (num == null || num === 0) {
    console.error('login first', num)
    throw new Error('login first')
  }

  return app.lookupPrivateKey(0, num)
}

// publicKey returns the current public key
app.publicKey = () => app.privateKey().publicKey

// isLoggedIn check if user is logged into the wallet
app.isLoggedIn = () => !!app.xPriv()

// lookupPrivateKey returns a bsv.PrivateKey
app.lookupPrivateKey = (chain, num) => {
  let hdPrivateKey = app.hdPrivateKey()
  if (!hdPrivateKey) {
    throw new Error('hd key must be set before looking up a child key')
  }
  return hdPrivateKey.deriveChild('m/' + chain + '/' + num).privateKey
}

// utxos a wallet can have many utxos consume the top `max` utxos by value
app.utxos = (max = 5) => {
  let utxos = app.state[UTXOS_KEY] || []
  utxos = utxos.map(utxo => {
    // remove when allaboard is bsv lib compliant :(
    if (!utxo.satoshis) {
      utxo.satoshis = utxo.value
    }
    return utxo
  })

  if (!utxos || !max) {
    return utxos
  }

  return utxos
    .sort((a, b) => {
      return a.satoshis > b.satoshis ? -1 : 1
    })
    .slice(0, max)
}

// qrCode returns an svg qr code of current HD address
app.qrCode = (size = 300, format = 'svg') => {
  return (
    qrCodeProvider +
    'create-qr-code/?' +
    '&qzone=1' +
    '&data=' +
    satchel.address().toString() +
    '&size=' +
    size +
    'x' +
    size +
    '&format=' +
    format
  )
}

// new generates a new mnemonic and logs in (english only for now)
// todo: allow multiple language support
app.new = async () => {
  let mnemonic = Mnemonic.fromRandom()
  await app.login(mnemonic.toString())
  return mnemonic
}

// next calls next address BitIndex endpoint and set num and returns the full API response
app.next = async () => {
  if (!app.xPub()) {
    return []
  }
  let url = app.rpcXpub + '/xpub/status'

  const data = {
    xpub: app.xPub()
  }

  // let r = await fetch(url, data, header)
  let res
  try {
    let r = await fetch(url, {
      credentials: 'same-origin', // 'include', default: 'omit'
      method: 'POST', // 'GET', 'PUT', 'DELETE', etc.
      body: new URLSearchParams(data), // Use correct payload (matching 'Content-Type')
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    })

    res = await r.json()

  } catch (e) {
    return e
  }

  // todo: check the response and make sure its valid

  // if (res.utxos instanceof Array && res.length) {
  //   num = res.utxos.sort((a, b) => {
  //     return a.num > b.num ? 1 : -1
  //   }).filter(a => { return a.chain === 0 })[0].num
  // }

  app.state[CONFIRMED_BALANCE_KEY] =
    res.confirmed && res.confirmed.length ? parseInt(res.confirmed) : 0
  app.state[UNCONFIRMED_BALANCE_KEY] =
    res.unconfirmed && res.unconfirmed.length ? parseInt(res.unconfirmed) : 0
  app.state[UTXOS_KEY] = res.utxos
  // ToDo -= this really gotta be a string?
  app.state[NUM_KEY] = res && res.next_num ? res.next_num.toString() : '0'
  app.persistState(app.state)

  return res
}

// setMnemonicAnchor pass an element or querySelector to apply mnemonic download href and un-hide element
app.setMnemonicAnchor = a => {
  let el
  if (typeof a === 'string') {
    el = document.querySelector(a)
  } else if (a instanceof HTMLAnchorElement) {
    el = a
  } else {
    console.warn(
      'invalid anchor. Must be a HTMLAnchorElement, or a string for document.querySelector()'
    )
    return
  }
  if (!el) {
    throw new Error('Cant find anchor element')
  }
  el.attributes['download'] = 'mnemonic-satchel.txt'
  let href = app.downloadHref()
  if (href) {
    el.href = href
    el.style.display = 'unset'
  }
}

// downloadHref Used internally by setMnemonicAnchor
app.downloadHref = () => {
  let mnemonic = app.mnemonic()
  if (!mnemonic) {
    return
  }

  const blob = new window.Blob([mnemonic], {
    type: 'text/plain'
  })

  return URL.createObjectURL(blob)
}

// login with xPriv or Mnemonic
app.login = async xprvOrMnemonic => {
  if (!xprvOrMnemonic) {
    throw new Error('Private key required')
  }

  let hdPrivateKey

  if (xprvOrMnemonic.split(' ').length === 12) {
    if (!Mnemonic.isValid(xprvOrMnemonic)) {
      throw new Error('Invalid mnemonic')
    }
    const importedMnemonic = Mnemonic.fromString(xprvOrMnemonic)
    hdPrivateKey = bsv.HDPrivateKey.fromSeed(
      importedMnemonic.toSeed(),
      'livenet'
    )
    app.state[MNEMONIC_KEY] = xprvOrMnemonic
  } else {
    hdPrivateKey = bsv.HDPrivateKey.fromString(xprvOrMnemonic)
  }

  app.state[XPRIV_KEY] = hdPrivateKey.toString()
  app.state[XPUB_KEY] = bsv.HDPublicKey.fromHDPrivateKey(
    hdPrivateKey
  ).toString()
  app.persistState(app.state)

  await app.updateAll()

  if (!app.socket && app.bitsocketCallback) {
    app.bitsocketListener()
  }
}

// updateAll updates if app.timestamp is older than app.updateDebounce
app.updateAll = async () => {
  let ts = app.timestamp()
  if (!ts || new Date().getTime() - parseInt(ts) > app.updateDebounce) {
    // if (!ts || new Date().getTime() - ts > app.updateDebounce) {
    // Gets next key pair position so we can derive keys
    app.state[TIMESTAMP_KEY] = new Date().getTime()
    app.persistState(app.state)

    await app.next()
    // await app.updateBalance()
    // await app.updateUtxos()
  }
}

app.logout = () => {
  // Clear state
  app.state = {}
  app.persistState({})

  // Close any open sockets
  if (app.socket) {
    app.socket.close()
  }
}

// newDataTx new data transaction, returns a new tx
app.newDataTx = async (data, address, satoshis) => {
  if (!app.isLoggedIn()) {
    throw new Error('satchel: sending without being logged in')
  }

  let tx = new satchel.bsv.Transaction() // todo: missing parameter?

  let utxos = app.utxos()

  tx.from(utxos)
  if (address && satoshis > 0) {
    if (!bsv.Address.isValid(address, 'livenet', 'pubkey')) {
      throw new Error('satchel: invalid address')
    }
    tx.to(address, satoshis)
  }

  tx = app.addOpReturnData(tx, data)
  tx.feePerKb(app.feePerKb)
  tx.change(app.changeAddress())

  tx = app.cleanTxDust(tx)

  for (const utxo of utxos) {
    if (app.debug) {
      console.log('lookup', utxo.chain, utxo.num)
    }
    let pk = app.lookupPrivateKey(utxo.chain, utxo.num)
    tx.sign(pk) // todo: missing second parameter
  }
  return tx
}

// sendDataTx send a data tx - broadcasts tx
app.sendDataTx = async (data, address, satoshis) => {
  let tx = await app.newDataTx(data, address, satoshis)
  return app.broadcastTx(tx)
}

// send a normal tx and broadcasts tx
app.send = async (address, satoshis) => {
  if (!app.isLoggedIn()) {
    throw new Error('satchel: sending without being logged in')
  }

  if (!bsv.Address.isValid(address, 'livenet', 'pubkey')) {
    throw new Error('satchel: invalid address')
  }

  let tx = new bsv.Transaction() // todo: missing parameter?
  let utxos = app.utxos()
  tx.from(utxos)
  tx.to(address, satoshis)
  tx.feePerKb(app.feePerKb)
  tx.change(app.changeAddress())

  tx = app.cleanTxDust(tx)

  for (let i in utxos) {
    tx.sign(app.lookupPrivateKey(utxos[i].chain, utxos[i].num)) // todo: missing second parameter
  }

  return app.broadcastTx(tx)
}

// cleanTxDust cleans the tx dust
app.cleanTxDust = tx => {
  for (let i = 0; i < tx.outputs.length; ++i) {
    if (tx.outputs[i]._satoshis > 0 && tx.outputs[i]._satoshis < dustLimit) {
      tx.outputs.splice(i, 1)
      --i
    }
  }

  return tx
}

// addOpReturnData adds op_return data to txt
app.addOpReturnData = (tx, data) => {
  const script = new bsv.Script()
  script.add(bsv.Opcode.OP_FALSE)
  script.add(bsv.Opcode.OP_RETURN)

  for (const m of data) {
    // Detect hex prefix
    if (typeof m === 'string' && m.startsWith('0x')) {
      script.add(Buffer.from(m.substring(2), 'hex'))
    } else {
      // Otherwise, assume string
      script.add(Buffer.from(m))
    }
  }

  tx.addOutput(
    new bsv.Transaction.Output({
      script: script,
      satoshis: 0
    })
  )

  return tx
}

// broadcastTx broadcast the tx
app.broadcastTx = async (
  tx,
  options = {
    safe: true, // check serialization
    testing: false // if true dont actually broadcast to network
  }
) => {
  let txData
  if (options.safe) {
    txData = tx.serialize()
  } else {
    txData = tx.uncheckedSerialize()
  }

  if (options.testing) {
    return tx
  } else {
    const url = app.rpc + '/api/v3/main/tx/send'
    const data = {
      method: 'POST',
      body: JSON.stringify({
        rawtx: txData
      }),
      headers: jsonHeader()
    }

    try {
      let res = await fetch(url, data)
      if (res.status !== 200) {
        throw new Error('Failed to broadcast')
      }
      return await res.json()
    } catch (e) {
      throw new Error(e)
    }
  }
}

// updateBalance update the balance from rpc provider
app.updateBalance = async () => {
  // const url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/status'
  // const header = {
  //   headers: bitindexHeader()
  // }
  // let addrInfo
  // try {
  //   let res = await fetch(url, header)
  //   addrInfo = await res.json()
  // } catch (e) {
  //   throw new Error(e)
  // }

  // todo: check that we got the right values (confirmed, unconfirmed, etc)

  return app.balance()
}

// updateUtxos update utxos from rpc provider
// app.updateUtxos = async () => {
//   // const url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/utxo'
//   // const header = {
//   //   headers: bitindexHeader()
//   // }
//   // let utxos
//   // try {
//   //   let res = await fetch(url, header)
//   //   utxos = await res.json()
//   //   if (!utxos) {
//   //     utxos = []
//   //   }
//   // } catch (e) {
//   //   throw new Error(e)
//   // }

//   // if (utxos instanceof Array) {
//   //   utxos.sort((a, b) => (a.satoshis > b.satoshis) ? 1
//   //     : ((a.satoshis < b.satoshis) ? -1
//   //       : 0))
//   // }

//   return app.getU
// }

// queryPlanaria queries planaria
app.queryPlanaria = async q => {
  if (app.planariaApiKey === '') {
    throw new Error('planariaApiKey option not set')
  }

  const b64 = btoa(JSON.stringify(q))
  const url = app.planariaUrl + b64

  const header = {
    headers: {
      key: app.planariaApiKey
    }
  }

  try {
    let r = await fetch(url, header)
    return await r.json()
  } catch (e) {
    throw new Error(e)
  }
}

// monitorAddressQuery Planarium + BitSocket queries for monitoring logged in address
app.monitorAddressQuery = addressList => ({
  v: 3,
  q: {
    find: {
      $or: [
        { 'in.e.a': { $in: addressList } },
        { 'out.e.a': { $in: addressList } }
      ]
    }
  }
})

// txsQuery transaction query for planaria
app.txsQuery = (txList, limit, page = 1) => ({
  v: 3,
  q: {
    find: {
      'tx.h': { $in: txList }
    },
    limit: limit,
    skip: (page - 1) * limit
  }
})

// bitsocketListener pass a callback to init wallet listens to socket on login
// fires the callback when anything is received
app.bitsocketListener = (callback = app.bitsocketCallback) => {
  if (!app.bitsocketUrl) {
    throw new Error('Error: bitsocketUrl is not defined')
  }
  if (!app.bitsocketCallback) {
    throw new Error('Error: bitsocketCallback is not defined')
  }

  const q = app.monitorAddressQuery([
    app.address().toString(),
    app.changeAddress().toString()
  ])
  const b64 = btoa(JSON.stringify(q))
  const url = app.bitsocketUrl + b64

  if (app.debug) {
    console.info(
      'Satchel: Initialized bitsocket listener. URL:',
      app.bitsocketUrl,
      'query:',
      q
    )
  }

  app.socket = new EventSource(url)
  app.socket.onmessage = async e => {
    let r = JSON.parse(e.data)

    if (app.debug) {
      console.info('Satchel: Bitsocket message', r)
    }

    if (r.hasOwnProperty('type') && r.type === 't') {
      const tx = r.data[0]
      let sats = 0

      for (const input of tx.in) {
        if (
          input.e.a === app.address().toString() ||
          input.e.a === app.changeAddress().toString()
        ) {
          // handle outgoing tx
          sats += input.e.v
          let unconfirmedBalance = app.balance() - sats

          // Persist
          app.state[CONFIRMED_BALANCE_KEY] = 0
          app.state[UNCONFIRMED_BALANCE_KEY] = unconfirmedBalance
          app.persistState(app.state)

          // wait a second
          await sleep(1000)

          // Temporary - Tell Allaboard to Update Balance
          await app.updateStatus()

          // Get next address
          await app.next()

          if (callback) {
            callback(tx)
          }
        }
      }

      sats = 0
      for (const out of tx.out) {
        if (
          out.e.a === app.address().toString() ||
          out.e.a === app.changeAddress().toString()
        ) {
          // handle incoming tx
          sats += out.e.v
          let unconfirmedBalance = app.unconfirmedBalance() + sats

          // Persist
          app.state[UNCONFIRMED_BALANCE_KEY] = unconfirmedBalance
          app.persistState(app.state)

          // wait a second
          await sleep(1000)

          // Temporary - Tell Allaboard to Update Balance
          await app.updateStatus()

          // Get next address
          await app.next()

          // Update Balance
          // await app.updateBalance()

          // Update UTXOs
          // await app.updateUtxos()

          if (callback) {
            callback(tx)
          }
        }
      }
    }
  }
}

// ToDo - remove when allaboard will monitor chain and update cache without being kicked
app.updateStatus = async () => {
  if (!app.xPub()) {
    return []
  }
  let url = app.rpcXpub + '/xpub/update'

  const data = {
    xpub: app.xPub()
  }

  let r = await fetch(url, {
    credentials: 'same-origin', // 'include', default: 'omit'
    method: 'POST', // 'GET', 'PUT', 'DELETE', etc.
    body: new URLSearchParams(data), // Use correct payload (matching 'Content-Type')
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  })

  return await r.json()
}

// estimateFee sets the estimated fee on a given tx
app.estimateFee = tx => {
  tx.fee(defaults.fee).change(app.changeAddress())
  if (options.pay && options.pay.fee) {
    tx.fee(options.pay.fee)
  } else {
    let estSize = Math.ceil(tx._estimateSize() * feeEstimatedMultiplier)
    tx.fee(estSize)
  }
}

// getHistory will return the history for the current wallet
// Todo - allaboard xpub history
app.getHistory = async () => {
  if (!app.xPub()) {
    return []
  }

  let url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/txs'

  // Bitindex api key
  const header = {
    headers: bitindexHeader()
  }

  let r = await fetch(url, header)
  let res = await r.json()

  // todo: error handling? make sure response is valid?

  return app.queryPlanaria(
    app.txsQuery(
      res.map(record => {
        return record.txid
      })
    )
  )
}

// init starts the satchel application
app.init = async (options = {}) => {
  // overwrite any variables in app passed from options
  for (const [key, value] of Object.entries(options)) {
    app[key] = value
  }

  app.state = app.loadState()

  try {
    if (app.isLoggedIn()) {
      await app.updateAll()
      if (app.bitsocketListener) {
        await app.bitsocketListener()
      }
    }
  } catch (e) {
    console.error('failed to initialize', e)
    return new Error('failed to initialize')
  }
}

window.satchel = app
