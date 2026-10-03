import React from 'react';
import { Star } from 'lucide-react';

const RatingStars = ({ rating = 0, max = 5, size = 'md', showValue = true }) => {
  const sizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const sizeClass = sizes[size] || sizes.md;
  const rounded = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of ${max}`}>
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`${sizeClass} ${
              i < rounded ? 'fill-amber-400 text-amber-400' : 'fill-slate-800 text-slate-700'
            }`}
          />
        ))}
      </span>
      {showValue && <span className="text-xs font-semibold text-slate-300">{rating.toFixed(1)}</span>}
    </span>
  );
};

export default RatingStars;
