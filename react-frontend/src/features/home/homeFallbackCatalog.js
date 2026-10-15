export const homeFallbackCatalog = {
  fallbackCounts: { providers: 120, services: 170 },
  categories: [
    { id: 'home-cleaning', name: 'Home Cleaning', icon: '🧹', bgImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', subServices: ['Full Home Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning', 'Floor Cleaning Service'] },
    { id: 'salon-at-home', name: 'Salon at Home', icon: '💇', bgImage: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80', subServices: ['Haircut & Styling', 'Facial & Cleanup', 'Manicure & Pedicure'] },
    { id: 'plumbing', name: 'Plumbing', icon: '🔧', bgImage: 'assets/images/plumbing-category-realistic.jpeg', subServices: ['Plumbing'] },
    { id: 'electrician', name: 'Electrician', icon: '⚡', bgImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80', subServices: ['Electrician'] },
    { id: 'appliance-repair-installation', name: 'Appliance Repair / Installation', icon: '🛠', bgImage: 'assets/images/appliance-repair-realistic.jpg', subServices: ['Washing Machine', 'Refrigerator', 'TV', 'Geyser', 'Chimney', 'Laptop/Desktop', 'AC'] },
    { id: 'pest-control', name: 'Pest Control', icon: '🐜', bgImage: 'assets/images/pest-control-realistic.jpg', subServices: ['General Pest Control', 'Termite Control', 'Cockroach Control'] },
    { id: 'painting', name: 'Painting', icon: '🎨', bgImage: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80', subServices: ['Painting'] },
    { id: 'carpentry', name: 'Carpentry', icon: '🪚', bgImage: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80', subServices: ['Furniture Repair', 'Door Repair / Installation'] },
  ],
  popularServices: [
    { title: 'Full Home Cleaning', description: 'Complete deep cleaning service for your entire home.', price: '₹999', rating: '4.9', categoryId: 'home-cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80' },
    { title: 'Bathroom Cleaning', description: 'Professional bathroom cleaning for a fresh and hygienic space.', price: '₹499', rating: '4.8', categoryId: 'home-cleaning', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80' },
    { title: 'Haircut & Styling', description: 'Salon-quality haircut and styling services at home.', price: '₹399', rating: '4.8', categoryId: 'salon-at-home', image: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80' },
    { title: 'Plumbing Service', description: 'Quick plumbing assistance for leaks, taps, and fittings.', price: '₹299', rating: '4.8', categoryId: 'plumbing', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80' },
    { title: 'AC Repair', description: 'Fast AC servicing and repair by trained professionals.', price: '₹799', rating: '4.9', categoryId: 'appliance-repair-installation', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80' },
    { title: 'Pest Control', description: 'Reliable pest control to keep your home safe and clean.', price: '₹899', rating: '4.8', categoryId: 'pest-control', image: 'assets/images/pest-control-realistic.jpg' },
  ],
}
