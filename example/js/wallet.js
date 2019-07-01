// Wait for page to load, then initialize satchel
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('textarea').value = 'loading...'
  await initSatchel()
})

// activeTx flag
let activeTx

// defaultOpReturnData default op return data
const defaultOpReturnData = ()  => {
  // let chain = 0
  // let num = 2
  // let pk = satchel.lookupPrivateKey(chain, num)
  // todo add metanet protocol
  // "meta", // metanet protocol prefix
  // "` + satchel.createMetaNode().address().toString() + `", // public key
  // "NULL",
  // "|",
  return `
[
"19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut",
"# hello world",
"text/markdown",
"UTF-8",
"demo.md",
"|",
"1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5",
"SET",
"app",
"satchel-demo",
"type",
"comment",
"user",
"satchmo"
]
`
}

// socketCallback create the callback
const socketCallback = (data) => {
  // Here you can react to wallet messages in your UI
  console.log('socket callback', data)
  walletLoaded()
}

// initSatchel start satchel
const initSatchel = async () => {
  /* INIT SATCHEL */

  // ***** REPLACE WITH YOUR PLANARIA API KEY ***** //
  let planariaApiKey = '1bCypws1toQHRkqQev22u7sWGrG9S1Vtf'

  // ***** REPLACE WITH YOUR BITINDEX API KEY ***** //
  // ***** GET ONE HERE: https://www.bitindex.network/#get-api-key //
  let bitIndexApiKey = '8RJ3oQyUNZW6PtVXZp64J1GsV5cRjaJveUB9JCFkQYzadKYfHGUeAJhXqhfSCXyx4q'

  await satchel.init({
    'planariaApiKey': planariaApiKey,
    'feePerKb': 1337,
    'bitsocketCallback': socketCallback,
    'bitIndexApiKey': bitIndexApiKey
  })
  await walletLoaded()
}

// loginPrompt prompts for login
const loginPrompt = async () => {
  let login = prompt('Enter a 12 word mnemonic')
  if (!satchel.login) {
    return
  }
  await satchel.login(login)
  if (satchel.isLoggedIn()) {
    console.log('logged in')
    await walletLoaded()
  }
}

// This creates a transaction but does not broadcast it yet
const makeTx = async () => {
  // Get the data array from the textarea and remove whitespace
  let val = document.querySelector('#data').value.replace(/\s+/g, '')

  // create a new tx from your satchel with the data array as OP_RETURN data
  let tx = await satchel.newDataTx(JSON.parse(val))

  // Update the UI
  document.getElementById('txHex').value = tx.toString()

  // set the active tx
  activeTx = tx
}

// broadcast a bitcoin tx
const broadcast = async () => {
  try {
    let tx = await satchel.broadcastTx(activeTx)
    let div = document.getElementById('successDiv')
    div.innerHTML = 'Success! <a href="' + 
      satchel.txLink(tx.txid) + '" target="_blank">' + tx.txid + '</a>'
  } catch (e) {
    console.error(e)
  }
}

// getHistory get the history for the wallet
const getHistory = async () => {
  let history = await satchel.getHistory()
  let historyDiv = document.createElement('div')

  // combine confirmed and unconfirmed items
  let items = history.u.concat(history.c)
  for (let i in items) {
    let item = items[i]
    console.log('history item', item)
    let anchor = document.createElement('a')
    anchor.href = satchel.txLink(item.tx.h)
    anchor.target = '_blank'
    anchor.innerText = item.tx.h
    historyDiv.appendChild(anchor)
    historyDiv.appendChild(document.createElement('br'))
  }
  document.body.appendChild(historyDiv)
}

// walletLoaded creates new wallet if it doesn't exist, and loads address/balance etc
const walletLoaded = async () => {

  // If you're not logged in, create a new HD private key
  if (!satchel.isLoggedIn()) {
    await satchel.new() 
  }

  // Set the mnemonic anchor if found
  if (satchel.mnemonic()) {
    satchel.setMnemonicAnchor(document.getElementById('downloadLink'))
  }

  // Update the UI with wallet info
  let div = document.createElement('div')
  let addressStr = satchel.address().toString()
  div.innerHTML = 'Address:' + addressStr + '<br />'
  div.innerHTML += 'Balance:' + satchel.balance() + '<br /><br />'
  div.innerHTML += '<img src="' + satchel.qrCode() + '" alt="Deposit Address" /><br /><br />'
  document.getElementById('wallet').innerHTML = ''
  document.getElementById('wallet').appendChild(div)

  // Sample BMAP tx
  document.querySelector('textarea').value = defaultOpReturnData()
}