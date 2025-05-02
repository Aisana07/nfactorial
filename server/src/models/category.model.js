const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  color: {
    type: String,
    default: '#3498db' 
  },
  icon: {
    type: String,
    default: 'fa-solid fa-tag'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

categorySchema.index({ user: 1, name: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 