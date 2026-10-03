import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    category: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Open', 'Investigating', 'Waiting for Customer', 'Waiting for Worker', 'Resolved', 'Rejected'],
      default: 'Open',
    },
    description: { type: String, trim: true, default: '' },
    evidence: { type: [String], default: [] },
    assignedTo: { type: String, trim: true, default: '' },
    timeline: {
      type: [{ event: String, at: Date, note: String }],
      default: [],
    },
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
