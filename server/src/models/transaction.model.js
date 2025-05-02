const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  }
}, {
  timestamps: true
});

transactionSchema.index({ user: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 