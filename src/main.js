const qrcode = require('qrcode-generator')

const bsv = require('bsv')
const mnemonic = require('bsv/mnemonic')
const sb = require('satoshi-bitcoin')
const explorer = require('bitcore-explorers')
const dustLimit = 546

const app = {}
app.bsv = bsv
app.feePerKb = 1000
app.rpc = 'https://api.bitindex.network'
app.planariaApiKey = ''
app.planariaUrl = 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'

// this must be set to enable bitsocket
app.bitsocketUrl = 'https://chronos.bitdb.network/s/1P6o45vqLdo6X8HRCZk8XuDsniURmXqiXo/'
app.debug = false

// this must be set to enable bitsocket
app.bitsocketCallback = null
app.socket = null

// pass a callback to init
// wallet listens to socket on login
// fires the callback when anything is received
app.bitsocketListener = (callback = app.bitsocketCallback) => {
  if (!app.bitsocketUrl) { console.error('Error: bitsocketUrl is not defined') }
  if (!app.bitsocketCallback) { console.error('Error: bitsocketCallback is not defined') }

  const q = app.monitorAddressQuery(app.getAddressStr(), 100)
  const b64 = btoa(JSON.stringify(q))
  const url = app.bitsocketUrl + b64

  if (app.debug) {
    console.info('Satchel: Initialized bitsocket listener. URL', app.bitsocketUrl, 'query:', q)
  }

  app.socket = new EventSource(url)
  app.socket.onmessage = (e) => {
    let r = JSON.parse(e.data)

    if (app.debug) {
      console.info('Satchel: Bitsocket message', r)
    }

    if (r.type === 't') {
      const tx = r.data[0]
      let sats = 0
      for (const out of tx.out) {
        if (out.e.a === app.getAddressStr()) {
          sats += out.e.v
          localStorage.setItem('satchel.balance', app.getBalance() + sats)
          setTimeout(() => {
            app.updateUtxos()
          }, 5000)
        }
      }
    }
    callback(r)
  }
}

app.estimateFee = (tx) => {
  tx.fee(defaults.fee).change(address)
  if (options.pay && options.pay.fee) {
    tx.fee(options.pay.fee)
  } else {
    var estSize=Math.ceil(tx._estimateSize()*1.4)
    tx.fee(estSize)
  }
}

app.init = async (options = {}, callback) => {

  // overwrite any variables in app passed from options
  for (const o of Object.entries(options)) {
    app[o[0]] = o[1]
  }

  try {
    app.insight = await new explorer.Insight(app.rpc)
  } catch (e) {
    return new Error('Failed getting insight', e)
  }

  if (app.isLoggedIn()) {
    app.bitsocketListener()
  }

  if (callback) {
    callback()
  }

}

app.beforeEffects = {}
app.afterEffects = {}

app.before = (method, callback) => {
  if (typeof app.beforeEffects[method] === 'undefined') {
    app.beforeEffects[method] = []
  }

  app.beforeEffects[method].push(callback)
}

app.after = (method, callback) => {
  if (typeof app.afterEffects[method] === 'undefined') {
    app.afterEffects[method] = []
  }

  app.afterEffects[method].push(callback)
}

app.callBefore = (method, args) => {
  if (typeof app.beforeEffects[method] !== 'undefined') {
    for (const o of app.beforeEffects[method]) {
      o(...args)
    }
  }
}

app.callAfter = (method, args) => {
  if (typeof app.afterEffects[method] !== 'undefined') {
    for (const o of app.afterEffects[method]) {
      o(...args)
    }
  }
}

app.sat2bsv = (sat) => sb.toBitcoin(sat)
app.bsv2sat = (bsv) => sb.toSatoshi(bsv) | 0

app.receiveAddressLinkUrlMapper = (address) => `https://whatsonchain.com/address/${address}`
app.txLinkUrlMapper = (txid) => `https://whatsonchain.com/tx/${txid}`

app.getBalance = () => localStorage.getItem('satchel.balance')
app.getUnconfirmedBalance = () => localStorage.getItem('satchel.unconfirmed-balance')
app.getWif = () => localStorage.getItem('satchel.wif')
app.isLoggedIn = () => !!app.getWif()
app.getPrivateKey = () => new bsv.PrivateKey(app.getWif())
app.getAddress = () => app.getPrivateKey().toAddress()
app.getAddressStr = () => app.getAddress().toString()
app.getUtxos = (max = 5) => {
  let utxos = JSON.parse(localStorage.getItem('satchel.utxo') || '[]')

  if (!utxos || !max) { return utxos }
  return utxos.sort((a, b) => {
    return a.satoshis > b.satoshis ? -1 : 1
  }).slice(0, max)
}

app.generateQrCode = (address) => {
  app.callBefore('generateQrCode', [address])

  const typeNumber = 0
  const errorCorrectionLevel = 'H'

  const qr = qrcode(typeNumber, errorCorrectionLevel)
  qr.addData(address.toString())
  qr.make()

  app.callAfter('generateQrCode', [address, qr])

  return qr
}

app.generateAddress = () => {
  const hash = bsv.crypto.Hash.sha256(mnemonic.fromRandom().toSeed())
  const bn = bsv.crypto.BN.fromBuffer(hash)
  const key = new bsv.PrivateKey(bn)
  const address = key.toAddress().toString()

  return {
    'address': address,
    'mnemonic': mnemonic
  }
}

app.importMnemonic = (passphrase) => {
  if (!mnemonic.isValid(passphrase)) {
   window.alert('Invalid mnemonic')
   return false
  }

  const importedMnemonic = mnemonic.fromString(passphrase)
  const hash = bsv.crypto.Hash.sha256(importedMnemonic.toSeed())
  const bn = bsv.crypto.BN.fromBuffer(hash)
  const key = new bsv.PrivateKey(bn)

  const wif = key.toWIF()

  return wif
}

app.importWif = (wif) => {
  // todo: allow uncompressed wifs
  // todo: perform better checking of validity

  if (wif.length !== 52) {
    window.alert('WIF length must be 52')
    return false
  }

  if (wif[0] !== 'K' && wif[0] !== 'L') {
    window.alert('WIF must start with either a K or an L')
    return false
  }

  return wif
}

app.login = (wif, callback) => {
  app.callBefore('login', [wif])
  localStorage.setItem('satchel.wif', wif)
  app.updateBalance(app.updateUtxos(
    () => {
      if (app.debug) {
        console.info('Satchel: Logged in')
      }
      if (!app.socket) { app.bitsocketListener() }

      if (callback) {
        callback()
      }
      app.callAfter('login', [wif])
    },
    () => {
      if (callback) {
        callback()
      }
      // No UTXO
      app.callAfter('login', [wif])
    }
  ), (err) => {
    if (callback) {
      callback()
    }
    // No Balance
    app.callAfter('login', [wif])
  })
}

app.logout = (callback) => {
  app.callBefore('logout', [])

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

  if (callback) {
    callback()
  }

  app.callAfter('logout', [])
}

app.send = (address, satoshis, callback) => {
  app.callBefore('send', [address, satoshis])

  if (!app.isLoggedIn()) {
    throw new Error('satchel: sending without being logged in')
  }

  if (!bsv.Address.isValid(address)) {
    throw new Error('satchel: invalid address')
  }

  let tx = new bsv.Transaction()
  // a wallet can have a ton of utxos
  // consume the top 10 utxos by value
  tx.from(app.getUtxos())
  tx.to(address, satoshis)
  tx.feePerKb(app.feePerKb)
  tx.change(app.getAddress())

  tx = app.cleanTxDust(tx)
  tx.sign(app.getPrivateKey())

  app.broadcastTx(tx, (tx) => {
    if (callback) {
      callback(tx)
    }
  })

  app.callAfter('send', [address, satoshis, tx])
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

  for (const m of data) {
    if (m['type'] === 'hex') {
      script.add(Buffer.from(m['v'], 'hex'))
    } else if (m['type'] === 'str') {
      script.add(Buffer.from(m['v']))
    } else {
      throw new Error('unknown data type')
    }
  }

  tx.addOutput(new bsv.Transaction.Output({
    script: script,
    satoshis: 0
  }))

  return tx
}

app.broadcastTx = (tx, callback, errCallback, options = {
  safe: true, // check serialization
  testing: false // if true dont actually broadcast to network
}) => {
  app.callBefore('broadcastTx', [tx])

  let txData = ''
  if (options.safe) {
    txData = tx.serialize()
  } else {
    txData = tx.uncheckedSerialize()
  }

  if (options.testing) {
    if (callback) {
      callback(tx)
    }

    app.callAfter('broadcastTx', [tx])
  } else {
    app.insight.broadcast(txData, (err, res) => {
      if (err) {
        if (errCallback) {
          errCallback(err)
        }
      } else {
        if (callback) {
          callback(tx)
        }

        app.callAfter('broadcastTx', [tx])
      }
    })
  }
}

app.updateBalance = (callback, errCallback) => {
  app.callBefore('updateBalance', [app.getBalance()])

  if (!app.insight) {
    errCallback('No insight. Did you call init first?')
    return
  }

  app.insight.address(app.getAddressStr(), (err, addrInfo) => {
    if (err) {
      if (errCallback) {
        errCallback(err)
      }
    } else {
      localStorage.setItem('satchel.balance',
        addrInfo['balance'])
      localStorage.setItem('satchel.unconfirmed-balance',
        addrInfo['unconfirmedBalance'])
      localStorage.setItem('satchel.total-sent',
        addrInfo['totalSent'])
      localStorage.setItem('satchel.total-received',
        addrInfo['totalReceived'])

      if (callback) {
        callback(addrInfo)
      }

      app.callAfter('updateBalance', [app.getBalance()])
    }
  })
}

app.updateUtxos = (callback, errCallback) => {
  app.callBefore('updateUtxos', [])

  if (!app.insight) {
    errCallback('No insight. Did you call init first?')
    return
  }

  app.insight.getUnspentUtxos(app.getAddressStr(), (err, utxoInfo) => {
    if (err) {
      if (errCallback) {
        errCallback(err)
      }
    } else {
      const utxos = JSON.parse(JSON.stringify(utxoInfo)).map((v) => ({
        txId: v['txid'],
        outputIndex: v['vout'],
        address: v['address'],
        script: v['scriptPubKey'],
        satoshis: app.bsv2sat(v['amount'])
      }))

      utxos.sort((a, b) => (a.satoshis > b.satoshis) ? 1
        : ((a.satoshis < b.satoshis) ? -1
          : 0))

      localStorage.setItem('satchel.utxo', JSON.stringify(utxos))

      if (callback) { callback(utxoInfo) }

      app.callAfter('updateUtxos', [utxos])
    }
  })
}

app.queryPlanaria = (q, callback, fail) => {
  if (app.planariaApiKey === '') {
    window.alert('planariaApiKey option not set')
  }

  const b64 = btoa(JSON.stringify(q))
  const url = app.planariaUrl + b64

  const header = {
    headers: {
      key: app.planariaApiKey
    }
  }

  fetch(url, header)
    .then((r) => r.json())
    .then(callback).catch(fail)
}

// Planarium + BitSocket queries for monitoring logged in address
app.monitorAddressQuery = (addr, limit) => ({
  v: 3,
  q: {
    find: {
      '$or': [
        { 'in.e.a': addr },
        { 'out.e.a': addr }
      ]
    },
    limit: limit
  }
})

window.satchel = app
