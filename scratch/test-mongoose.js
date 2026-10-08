const fs = require('fs');
const mongoose = require('mongoose');
const { decryptData } = require('./lib/encryption.js'); 
// wait, encryption.ts is typescript. I can't easily require it in node without compiling.

