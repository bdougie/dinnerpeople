import { useMemo } from 'react';

interface Quote {
  text: string;
  author: string;
}

const foodQuotes: Quote[] = [
  {
    text: "Dinner is not just about feeding the body; it's about nourishing the soul.",
    author: "Alice Waters"
  },
  {
    text: "Food brings people together on many different levels. It's nourishment of the soul and body; it's truly love.",
    author: "Giada De Laurentiis"
  },
  {
    text: "If you really want to make a friend, go to someone's house and eat with him… The people who give you their food give you their heart.",
    author: "Cesar Chavez"
  },
  {
    text: "One cannot think well, love well, sleep well, if one has not dined well.",
    author: "Virginia Woolf"
  },
  {
    text: "Meals make the society, hold the fabric together in lots of ways that were charming and interesting and intoxicating to me. The perfect meal, or the best meals, occur in a context that frequently has very little to do with the food itself.",
    author: "Anthony Bourdain"
  },
  {
    text: "You learn a lot about someone when you share a meal together.",
    author: "Anthony Bourdain"
  },
  {
    text: "Good food ends with good talk.",
    author: "Geoffrey Neighor"
  },
  {
    text: "Food is our common ground, a universal experience.",
    author: "James Beard"
  },
  {
    text: "Cooking is all about people. Food is maybe the only universal thing that really has the power to bring everyone together. No matter what culture, everywhere around the world, people eat together.",
    author: "Guy Fieri"
  },
  {
    text: "If the home is a body, the table is the heart, the beating center, the sustainer of life and health.",
    author: "Shauna Niequist"
  },
  {
    text: "Food, in the end, in our own tradition, is something holy. It's not about nutrients and calories. It's about sharing. It's about honesty. It's about identity.",
    author: "Louise Fresco"
  }
];

export function useFoodQuote(): Quote {
  // Use useMemo to ensure the quote only changes when the component mounts
  // and not on every re-render
  return useMemo(() => {
    const randomIndex = Math.floor(Math.random() * foodQuotes.length);
    const quote = foodQuotes[randomIndex];
    if (!quote) {
      return foodQuotes[0]!;
    }
    return quote;
  }, []);
}
