import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['UPI', 'Card', 'Cash', 'Netbanking', 'Wallet'], default: 'UPI' },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed', 'Refunded'], default: 'Pending' },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
