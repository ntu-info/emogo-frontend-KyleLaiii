// backend/models/Record.js
const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
    },
    sentiment: {
      type: String,
      enum: ['非常差', '較差', '一般', '較好', '非常好', 'unknown'],
      default: 'unknown',
    },
    sentimentValue: {
      type: Number,
      min: 0,
      max: 5,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    videoCloudinaryId: {
      type: String,
      default: null,
    },
    videoBase64: {
      type: String,
      default: null,
    },
    isUploaded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Record', RecordSchema);
