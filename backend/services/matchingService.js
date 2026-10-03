import WorkerProfile from '../models/WorkerProfile.js';
import Ticket from '../models/Ticket.js';

/**
 * Automatically match and assign a worker to a ticket.
 * @param {Object} ticket - The mongoose Ticket document
 * @returns {Promise<Object|null>} - Returns the assigned worker's profile, or null if none match.
 */
export const matchWorkerForTicket = async (ticket) => {
  try {
    console.log(`[Matching] Initiating matching for ticket: ${ticket._id} (${ticket.category}, pincode: ${ticket.location.pincode})`);

    // 1. Filter WorkerProfile where isAvailable is true and skills contains ticket.category
    // and serviceArea matches the ticket's pincode
    const candidates = await WorkerProfile.find({
      isAvailable: true,
      skills: ticket.category,
      serviceArea: ticket.location.pincode,
    }).populate('userId', 'name email phone');

    if (!candidates || candidates.length === 0) {
      console.log(`[Matching] No available workers found with skill "${ticket.category}" in pincode "${ticket.location.pincode}"`);
      ticket.status = 'Pending';
      ticket.workerId = null;
      await ticket.save();
      return null;
    }

    console.log(`[Matching] Found ${candidates.length} worker candidates. Evaluating job loads...`);

    // 2. Fetch active job load for each candidate worker
    const candidatesWithLoad = await Promise.all(
      candidates.map(async (candidate) => {
        const activeJobsCount = await Ticket.countDocuments({
          workerId: candidate.userId._id,
          status: { $in: ['Assigned', 'In Progress'] },
        });

        return {
          profile: candidate,
          activeJobs: activeJobsCount,
          rating: candidate.rating,
        };
      })
    );

    // 3. Sort candidate workers by:
    //    a) Lowest active job load (to balance workloads)
    //    b) Highest rating (when workload is identical)
    candidatesWithLoad.sort((a, b) => {
      if (a.activeJobs !== b.activeJobs) {
        return a.activeJobs - b.activeJobs; // Ascending active jobs
      }
      return b.rating - a.rating; // Descending ratings
    });

    const topCandidate = candidatesWithLoad[0];
    console.log(`[Matching] Selected worker: ${topCandidate.profile.userId.name} (Active Jobs: ${topCandidate.activeJobs}, Rating: ${topCandidate.rating})`);

    // 4. Auto-assign the top-ranked worker and update ticket.status to 'Assigned'
    ticket.workerId = topCandidate.profile.userId._id;
    ticket.status = 'Assigned';
    await ticket.save();

    return topCandidate.profile;
  } catch (error) {
    console.error(`[Matching] Error in matching service: ${error.message}`);
    // Safe fallback: flag as Pending
    ticket.status = 'Pending';
    ticket.workerId = null;
    await ticket.save();
    return null;
  }
};
