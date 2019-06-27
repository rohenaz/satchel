document.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('textarea').value = 'loading...'
  await initSatchel()
})

let activeTx

const defaultOpReturnData = ()  => {
  let chain = 0
  let num = 2
  let pk = satchel.lookupPrivateKey(chain, num)
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

const socketCallback = (data) => {
  // Here you can react to wallet messages in your UI
  console.log('socket callback', data)
  walletLoaded()
}

const initSatchel = async () => {
  /* INIT SATCHEL */

  // ***** REPLACE WITH YOUR PLANARIA API KEY ***** //
  // ***** GET ONE HERE: https://www.bitindex.network/#get-api-key //
  let planariaApiKey = '1bCypws1toQHRkqQev22u7sWGrG9S1Vtf'

  // ***** REPLACE WITH YOUR BITINDEX API KEY ***** //
  // ***** GET ONE HERE: https://www.bitindex.network/#get-api-key //
  let bitIndexApiKey = 'AFiMUsLXkrrAVSjX2kVT2RaDqyPwvqXE4LdhYvS4vheoejohAEV5aLp1XrXmDfK9qp'

  await satchel.init({
    'planariaApiKey': planariaApiKey,
    'feePerKb': 1337,
    'bitsocketCallback': socketCallback,
    'bitIndexApiKey': bitIndexApiKey
  })
  await walletLoaded()
}

const loginPrompt = async () => {
  let login = prompt('Enter a 12 word mnemonic, or extended private key.')
  if (!satchel.login) { return }
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

const broadcast = async () => {
  try {
    await satchel.broadcastTx(activeTx)
  } catch (e) {
    console.error(e)
  }
}


const getHistory = async () => {
  let history = await satchel.getHistory()
  let historyDiv = document.createElement('div')
  // combine confirmed and unconfirmed items
  let items = history.u.concat(history.c)
  for (let i in items) {
    let item = items[i]
    console.log('history item', item)
    let itemDiv = document.createElement('div')
    itemDiv.innerText = item.tx.h
    historyDiv.appendChild(itemDiv)
  }
  document.body.appendChild(historyDiv)
}

const walletLoaded = async () => {

  // If you're not logged in, create a new HD private key
  if (!satchel.isLoggedIn()) {
    await satchel.new() 
  }

  if (satchel.mnemonic()) {
    satchel.setMnemonicAnchor(document.getElementById('downloadLink'))
  }

  // Update the UI with wallet info
  let div = document.createElement('div')
  let addressStr = satchel.address().toString()
  div.innerHTML = 'Address:' + addressStr + '<br />Balance:' + satchel.balance()
  document.getElementById('wallet').innerHTML = ''
  document.getElementById('wallet').appendChild(div)

  // Sample BMAP tx
  document.querySelector('textarea').value = defaultOpReturnData()
}