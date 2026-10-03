import axios from 'axios';



export const serviceCategoryMeta = {
  Plumbing: {
    description: 'Leaks, taps, pipes & drainage',
  },
  Electrical: {
    description: 'Switches, wiring, circuits & lighting',
  },
  'AC Repair': {
    description: 'Cooling, gas refill & compressor service',
  },
  'Appliance Repair': {
    description: 'Washing machines, refrigerators & ovens',
  },
  Carpentry: {
    description: 'Furniture, cabinets, doors & fittings',
  },
  Cleaning: {
    description: 'Home deep clean, sanitization & upkeep',
  },
  Painting: {
    description: 'Interior, exterior & touch-up painting',
  },
  'Door & Window': {
    description: 'Repairs, alignment & lock replacement',
  },
};

export const defaultServiceCategories = [
  {
    name: 'Plumbing',
    description: serviceCategoryMeta.Plumbing.description,
  },
  {
    name: 'Electrical',
    description: serviceCategoryMeta.Electrical.description,
  },
  {
    name: 'AC Repair',
    description: serviceCategoryMeta['AC Repair'].description,
  },
  {
    name: 'Appliance Repair',
    description: serviceCategoryMeta['Appliance Repair'].description,
  },
  {
    name: 'Carpentry',
    description: serviceCategoryMeta.Carpentry.description,
  },
  {
    name: 'Cleaning',
    description: serviceCategoryMeta.Cleaning.description,
  },
  {
    name: 'Painting',
    description: serviceCategoryMeta.Painting.description,
  },
  {
    name: 'Door & Window',
    description: serviceCategoryMeta['Door & Window'].description,
  },
];

export const mockNotifications = [
  {
    id: 'n1',
    title: 'Rahul Kumar accepted your service request',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Your AC service is scheduled for tomorrow',
    time: '1 hour ago',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Payment of ₹850 was successful',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'n4',
    title: 'Please rate your recent service',
    time: '2 days ago',
    unread: false,
  },
];

export const mockProfessionals = [
  {
    id: 'p1',
    name: 'Rahul Kumar',
    profession: 'AC Technician',
    rating: 4.9,
    reviews: 128,
    distance: '1.8 km away',
    availability: 'Usually responds within 5 min',
    price: 499,
    category: 'AC Repair',
    verified: true,
  },
  {
    id: 'p2',
    name: 'Sneha Sharma',
    profession: 'Plumbing Expert',
    rating: 4.8,
    reviews: 104,
    distance: '2.1 km away',
    availability: 'Available today',
    price: 549,
    category: 'Plumbing',
    verified: true,
  },
  {
    id: 'p3',
    name: 'Amit Joshi',
    profession: 'Electrician',
    rating: 4.9,
    reviews: 89,
    distance: '1.2 km away',
    availability: 'Fast responses',
    price: 499,
    category: 'Electrical',
    verified: true,
  },
  {
    id: 'p4',
    name: 'Priya Verma',
    profession: 'Carpentry Specialist',
    rating: 4.7,
    reviews: 76,
    distance: '3.0 km away',
    availability: 'Bookings in 30 min',
    price: 599,
    category: 'Carpentry',
    verified: true,
  },
];

const mockSpendingHistory = [
  { label: 'June', value: 2450 },
  { label: 'July', value: 4820 },
  { label: 'August', value: 3150 },
];

const ticketCategoryEstimatedPrice = {
  Plumbing: 850,
  Electrical: 650,
  'AC Repair': 1200,
  'Appliance Repair': 950,
  Carpentry: 720,
  Cleaning: 520,
  Painting: 780,
  'Door & Window': 680,
};

export const fetchServiceCategories = async () => {
  try {
    const response = await axios.get('/tickets/services');
    if (response.data.success && Array.isArray(response.data.services) && response.data.services.length > 0) {
      return response.data.services.map((service) => ({
        name: service.name,
        description:
          serviceCategoryMeta[service.name]?.description ||
          'Trusted local experts for your home.',
      }));
    }
  } catch (error) {
    // Fallback to default categories if backend service list is unavailable.
  }

  return defaultServiceCategories;
};

export const fetchCustomerTickets = async () => {
  try {
    const response = await axios.get('/tickets/my-tickets');
    if (response.data.success && Array.isArray(response.data.tickets)) {
      return response.data.tickets;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch customer tickets:', error);
    return [];
  }
};

// Registered workers from the database, mapped to the card shape used by
// the Recommended Professionals section of the customer dashboard.
export const fetchRecommendedWorkers = async () => {
  try {
    const response = await axios.get('/workers');
    if (response.data.success && Array.isArray(response.data.workers)) {
      return response.data.workers.map((w) => ({
        id: w._id,
        name: w.name,
        profession: (w.skills || [])[0] || 'Home Professional',
        skills: w.skills || [],
        rating: w.rating ?? 5,
        reviews: w.jobsCompleted ?? 0,
        distance: w.serviceArea ? `Serves ${w.serviceArea}` : 'Service area pending',
        availability:
          w.suspended || !w.isAvailable
            ? 'Currently busy'
            : w.emergencyService
              ? 'Available now • emergency service'
              : 'Available now',
        price: w.rate ?? 0,
        category: (w.skills || [])[0] || '',
        verified: w.verificationStatus === 'Approved',
        verificationStatus: w.verificationStatus,
        verifiedItems: w.verifiedItems ?? 0,
        totalVerificationItems: w.totalVerificationItems ?? 7,
        isAvailable: w.isAvailable !== false && !w.suspended,
        emergencyService: !!w.emergencyService,
        experience: w.experience || '',
        description: w.description || '',
        workingHours: w.workingHours || { start: '09:00', end: '18:00' },
        availableDays: w.availableDays || [],
        email: w.email || '',
        phone: w.phone || '',
        memberSince: w.memberSince || null,
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch recommended workers:', error);
    return [];
  }
};

export const estimateTicketAmount = (ticket) => {
  if (!ticket) return 0;
  if (ticket.amount) return ticket.amount;
  return ticketCategoryEstimatedPrice[ticket.category] || 650;
};

export const getSpendingHistory = () => mockSpendingHistory;
