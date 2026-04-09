// models/clientConfig.model.js
const mongoose = require('mongoose');

const clientConfigSchema = new mongoose.Schema({
  activeClients: {
    type: Map,
    of: String, // hash
    default: {}
  },
  excludedAccounts: {
    type: [Number],
    default: []
  }
});

module.exports = mongoose.model('ClientConfig', clientConfigSchema);