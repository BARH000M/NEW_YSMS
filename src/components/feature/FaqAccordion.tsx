import { useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-background-200 border-y border-background-200">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 py-4 text-start cursor-pointer"
            >
              <span className="text-sm md:text-base font-semibold text-foreground-900">{item.question}</span>
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-background-100 text-foreground-700 shrink-0">
                <i className={isOpen ? 'ri-subtract-line' : 'ri-add-line'} />
              </span>
            </button>
            {isOpen && <p className="text-sm text-foreground-600 leading-relaxed pb-5 pe-10">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}