const bsv = require('bsv')
const Mnemonic = require('bsv/mnemonic')
const qrcode = require('qrcode-generator')
const sb = require('satoshi-bitcoin')

const dustLimit = 546

const app = {}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.bitIndexApiKey = ''
app.bsv = bsv
app.mnemonic = Mnemonic
app.feePerKb = 1000
app.rpc = 'https://api.bitindex.network'
app.planariaApiKey = ''
app.updateDebounce = 10000

app.planariaUrl = 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'

// this must be set to enable bitsocket
app.bitsocketUrl = 'https://chronos.bitdb.network/s/1P6o45vqLdo6X8HRCZk8XuDsniURmXqiXo/'
app.debug = false

// this must be set to enable bitsocket
app.bitsocketCallback = null
app.socket = null

const jsonHeader = () => {
  return {
    accept: 'application/json',
    'content-type': 'application/json'
  }
}

const bitindexHeader = () => {
  let header = jsonHeader()
  header.api_key = app.bitIndexApiKey
  return header
}

// pass a callback to init
// wallet listens to socket on login
// fires the callback when anything is received
app.bitsocketListener = (callback = app.bitsocketCallback) => {
  if (!app.bitsocketUrl) { console.error('Error: bitsocketUrl is not defined') }
  if (!app.bitsocketCallback) { console.error('Error: bitsocketCallback is not defined') }

  const q = app.monitorAddressQuery([app.address().toString(), app.changeAddress().toString()])
  const b64 = btoa(JSON.stringify(q))
  const url = app.bitsocketUrl + b64

  if (app.debug) {
    console.info('Satchel: Initialized bitsocket listener. URL', app.bitsocketUrl, 'query:', q)
  }

  app.socket = new EventSource(url)
  app.socket.onmessage = async (e) => {
    let r = JSON.parse(e.data)

    if (app.debug) {
      console.info('Satchel: Bitsocket message', r)
    }

    if (r.type === 't') {
      const tx = r.data[0]
      let sats = 0
      
      for (const input of tx.in) {
        if (input.e.a === app.address().toString() ||
          input.e.a === app.changeAddress().toString()) {
            // handle outgoing tx
            sats += input.e.v
            localStorage.setItem('satchel.confirmed-balance', 0)
            localStorage.setItem('satchel.unconfirmed-balance', app.balance() - sats)

            // wait a second
            await sleep(1000)
            
            // Get next address
            await app.next()
            // Update Balance
            await app.updateBalance()
            // Update UTXOs
            await app.updateUtxos()

            if (callback) { callback(tx) }
        }
      }

      sats = 0
      for (const out of tx.out) {
        if (out.e.a === app.address().toString() ||
          out.e.a === app.changeAddress().toString()) {
          // handle incoming tx
          sats += out.e.v
          localStorage.setItem('satchel.unconfirmed-balance', app.unconfirmedBalance() + sats)

          // wait a second
          await sleep(1000)
          
          // Get next address
          await app.next()
          // Update Balance
          await app.updateBalance()
          // Update UTXOs
          await app.updateUtxos()

          if (callback) { callback(tx) }
        }
      }
    }
  }
}

app.estimateFee = (tx) => {
  tx.fee(defaults.fee).change(app.changeAddress())
  if (options.pay && options.pay.fee) {
    tx.fee(options.pay.fee)
  } else {
    var estSize=Math.ceil(tx._estimateSize()*1.4)
    tx.fee(estSize)
  }
}

app.getHistory = async () => {
  if (!app.xPub()) { return [] }
  let url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/txs'

  // Bitindex api key
  const header = {
    headers: bitindexHeader()
  }
  let r = await fetch(url, header)
  
  let res = await r.json()
  
  return await app.queryPlanaria(app.txsQuery(res.map(record => { return record.txid })))
}

app.init = async (options = {}) => {

  // overwrite any variables in app passed from options
  for (const o of Object.entries(options)) {
    app[o[0]] = o[1]
  }

  try {
    if (app.isLoggedIn()) {
      // ToDo - Check Timestamp to not trigger on every reload
      await app.updateAll()
      await app.bitsocketListener()
    }
  } catch (e) {
    return new Error('Failed getting insight', e)
  }
}

app.sat2bsv = (sat) => sb.toBitcoin(sat)
app.bsv2sat = (bsv) => sb.toSatoshi(bsv) | 0

app.receiveAddressLinkUrlMapper = (address) => `https://whatsonchain.com/address/${address}`
app.txLinkUrlMapper = (txid) => `https://whatsonchain.com/tx/${txid}`
// returns a bsv.Address
app.changeAddress = () => {
  let changeKey = app.lookupPrivateKey(1, localStorage.getItem('satchel.num'))
  return bsv.Address.fromPrivateKey(changeKey)
}
// returns a bsv.Address
app.address = () => {
  let pubkey = app.publicKey()
  return bsv.Address.fromPublicKey(pubkey)
}
app.balance = () => { return app.confirmedBalance() + app.unconfirmedBalance() }
app.confirmedBalance = () => parseInt(localStorage.getItem('satchel.confirmed-balance') || 0)
app.hdPrivateKey = () => new bsv.HDPrivateKey.fromString(app.xPriv())
app.hdPublicKey = () => new bsv.HDPrivateKey.fromString(app.xPub())
app.mnemonic = () => localStorage.getItem('satchel.mnemonic')
app.timestamp = () => localStorage.getItem('satchel.timestamp')
app.unconfirmedBalance = () => parseInt(localStorage.getItem('satchel.unconfirmed-balance') || 0)
app.xPriv = () => localStorage.getItem('satchel.xpriv')
app.xPub = () => localStorage.getItem('satchel.xpub')

app.privateKey = () => {  
  // Get derived HD number
  let num = localStorage.getItem('satchel.num') || 0
  // If we don't have one, ask BitIndex
  if (!num || num.length === 0) {
    debugger
    throw new Error('log in first', num)
  }

  return app.lookupPrivateKey(0, num)
}
app.publicKey = () => app.privateKey().publicKey
app.isLoggedIn = () => !!app.xPriv()
// returns a bsv.PrivateKey
app.lookupPrivateKey = (chain, num) => {
  let hdPrivateKey = app.hdPrivateKey()
  if (!hdPrivateKey) {
    throw new Error('hd key must be set before looking up a child key')
  }
  return hdPrivateKey.deriveChild('m/' + chain + '/' + num).privateKey
}

app.utxos = (max = 5) => {
  let utxos = JSON.parse(localStorage.getItem('satchel.utxo') || '[]')

  if (!utxos || !max) { return utxos }
  return utxos.sort((a, b) => {
    return a.satoshis > b.satoshis ? -1 : 1
  }).slice(0, max)
}

app.generateQrCode = (address) => {
  const typeNumber = 0
  const errorCorrectionLevel = 'H'
  const qr = qrcode(typeNumber, errorCorrectionLevel)
  qr.addData(address.toString())
  qr.make()

  return qr
}

app.new = async () => {
  // generate a new mnemonic and log in
  let mnemonic = Mnemonic.fromRandom()
  await app.login(mnemonic.toString())
}

// Call next address BitIndex endpoint and set num
// Returns the full API response
app.next = async () => {
  if (!app.xPub()) { return [] }
  let url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/addrs/next'

  // Bitindex api key
  const header = {
    headers: bitindexHeader()
  }
  let r = await fetch(url, header)
  
  let res = await r.json()
  let num = 0
  if (res instanceof Array) {
    num = res.filter(a => { return a.chain === 0})[0].num
  }
  
  localStorage.setItem('satchel.num', num)
  return res
}

// Pass an element or querySelector to apply mnemonic download href
// and unhide element
app.setMnemonicAnchor = (a) => {
  let el
  if (typeof a === 'string') {
    el = document.querySelector(a)
  } else if (a instanceof HTMLAnchorElement) {
    el = a
  } else {
    console.warn('invalid type')
    return
  }
  if (!el) {
    throw new Error('Cant find anchor element')
  }
  el.attributes['download'] = 'mnemonic-satchel.txt'
  el.href = app.downloadHref()
  el.style.display = 'unset'
}

// Used internally by setMnemonicAnchor
app.downloadHref = () => {
  let mnemonic = app.mnemonic()
  if (!mnemonic) { return }
  const blob = new window.Blob([mnemonic], {
    type: 'text/plain'
  })

  return URL.createObjectURL(blob)
}

// Login with xPriv or Mnemonic
app.login = async (xprvOrMnemonic) => {

  let hdPrivateKey

  if (xprvOrMnemonic.split(' ').length === 12) {
    if (!Mnemonic.isValid(xprvOrMnemonic)) {
      throw new Error('Invalid mnemonic')
     }
    const importedMnemonic = Mnemonic.fromString(xprvOrMnemonic)
    hdPrivateKey = bsv.HDPrivateKey.fromSeed(importedMnemonic.toSeed())
    localStorage.setItem('satchel.mnemonic', xprvOrMnemonic)
  } else {
    hdPrivateKey = bsv.HDPrivateKey.fromString(xprvOrMnemonic)
  }

  localStorage.setItem('satchel.xpriv', hdPrivateKey.toString())
  localStorage.setItem('satchel.xpub', bsv.HDPublicKey.fromHDPrivateKey(hdPrivateKey).toString())

  await app.updateAll()

  if (!app.socket) { app.bitsocketListener() }
}

// Updates if app.timestamp is older than app.updateDebounce
app.updateAll = async () => {
  let ts = app.timestamp()
  if (!ts || (new Date().getTime() - parseInt(ts)) > app.updateDebounce) {
    // Gets next keypair position so we can derive keys
    localStorage.setItem('satchel.timestamp', new Date().getTime())
    await Promise.all([app.next(), app.updateBalance(), app.updateUtxos()])
  }
}

app.logout = () => {
  const localstorageKeys = []
  for (let i = 0; i < localStorage.length; ++i) {
    if (localStorage.key(i).substring(0, 7) === 'satchel') {
      localstorageKeys.push(localStorage.key(i))
    }
  }

  for (const k of localstorageKeys) {
    localStorage.removeItem(k)
  }

  if (app.socket) {
    app.socket.close()
  }
}

app.newDataTx = async (data, address, satoshis) => {
  if (!app.isLoggedIn()) {
    throw new Error('satchel: sending without being logged in')
  }

  let tx = new satchel.bsv.Transaction()
  tx.from(app.utxos())

  if (address && satoshis > 0) {
    if (!bsv.Address.isValid(address)) {
      throw new Error('satchel: invalid address')
    }
    tx.to(address, satoshis)
  }

  tx = app.addOpReturnData(tx, data)
  tx.feePerKb(app.feePerKb)
  tx.change(app.changeAddress())

  tx = app.cleanTxDust(tx)
  
  let utxos = app.utxos()
  for (let i in utxos) {
    let pk = app.lookupPrivateKey(utxos[i].chain, utxos[i].num)
    tx.sign(pk)
  }
  
  return tx
} 

app.sendDataTx = async (data, address, satoshis) => {
  let tx = await app.newDataTx(data, address, satoshis)
  return await app.broadcastTx(tx)
}

app.send = async (address, satoshis) => {

  if (!app.isLoggedIn()) {
    throw new Error('satchel: sending without being logged in')
  }

  if (!bsv.Address.isValid(address)) {
    throw new Error('satchel: invalid address')
  }

  let tx = new bsv.Transaction()
  // a wallet can have a ton of utxos
  // consume the top 10 utxos by value
  tx.from(app.utxos())
  tx.to(address, satoshis)
  tx.feePerKb(app.feePerKb)
  tx.change(app.changeAddress())

  tx = app.cleanTxDust(tx)
  
  let utxos = app.utxos()
  for (let i in utxos) {
    tx.sign(app.lookupPrivateKey(utxos[i].chain, utxos[i].num))
  }

  return await app.broadcastTx(tx)
}

app.cleanTxDust = (tx) => {
  for (let i = 0; i < tx.outputs.length; ++i) {
    if (tx.outputs[i]._satoshis > 0 && tx.outputs[i]._satoshis < dustLimit) {
      tx.outputs.splice(i, 1)
      --i
    }
  }

  return tx
}

app.addOpReturnData = (tx, data) => {

  const script = new bsv.Script()
  script.add(bsv.Opcode.OP_RETURN)

  for (const m in data) {
    // Detect hex prefix
    if (data[m].startsWith('0x')) {
      script.add(Buffer.from(data[m].substring(2), 'hex'))
    } else {
      // Otherwise, assume string
      script.add(Buffer.from(data[m]))
    }
  }

  tx.addOutput(new bsv.Transaction.Output({
    script: script,
    satoshis: 0
  }))

  return tx
}

app.broadcastTx = async (tx, options = {
  safe: true, // check serialization
  testing: false // if true dont actually broadcast to network
}) => {

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
      return await res.json()
    } catch (e) {
      throw new Error(e)
    }
  }
}

app.updateBalance = async () => {
  const url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/status'
  const header = {
    headers: bitindexHeader()
  }
  let addrInfo
  try {
    let res = await fetch(url, header)
    addrInfo = await res.json()
  } catch (e) {
    throw new Error(e)
  }

  localStorage.setItem('satchel.confirmed-balance', addrInfo.confirmed)
  localStorage.setItem('satchel.unconfirmed-balance', addrInfo.unconfirmed)
}

app.updateUtxos = async () => {
  const url = app.rpc + '/api/v3/main/xpub/' + app.xPub() + '/utxo'
  const header = {
    headers: bitindexHeader()
  }
  let utxos
  try {
    let res = await fetch(url, header)
    utxos = await res.json()
    if (!utxos) {
      utxos = []
    }
  } catch (e) {
    throw new Error(e)
  }

  if (utxos instanceof Array) {
    utxos.sort((a, b) => (a.satoshis > b.satoshis) ? 1
    : ((a.satoshis < b.satoshis) ? -1
      : 0))
  }

  localStorage.setItem('satchel.utxo', JSON.stringify(utxos))
  return utxos
}

app.queryPlanaria = async (q) => {
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

// Planarium + BitSocket queries for monitoring logged in address
app.monitorAddressQuery = (addressList) => ({
  v: 3,
  q: {
    find: {
      '$or': [
        { 'in.e.a': {'$in': addressList } },
        { 'out.e.a': {'$in': addressList } }
      ]
    }
  }
})

app.txsQuery = (txList, limit, page = 1) => ({
  v: 3,
  q: {
    find: {
      'tx.h': {'$in': txList}
    },
    limit: limit,
    skip: ((page - 1) * limit)
  }
})

window.satchel = app
