export const useLanguage = () => {
  if (navigator.language.includes("en")) {
    return "en";
  }
  if (navigator.language.includes("zh")) {
    return "zh";
  } else {
    return "en";
  }
};
