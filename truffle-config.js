module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "1743483099820"  // Your actual Ganache network ID
    }
  },
  compilers: {
    solc: {
      version: "0.8.19"
    }
  }
};