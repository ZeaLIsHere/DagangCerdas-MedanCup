module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
    }
  };
};
