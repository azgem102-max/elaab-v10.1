const { withAndroidStyles } = require("@expo/config-plugins");

module.exports = function withAndroidEdgeToEdge(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    const appTheme = styles.resources.style?.find(
      (s) => s.$.name === "AppTheme"
    );

    if (appTheme) {
      if (!Array.isArray(appTheme.item)) {
        appTheme.item = [];
      }

      const setOrAdd = (name, value) => {
        const existing = appTheme.item.find((i) => i.$.name === name);
        if (existing) {
          existing._ = value;
        } else {
          appTheme.item.push({ $: { name }, _: value });
        }
      };

      setOrAdd("android:windowTranslucentStatus", "true");
      setOrAdd("android:windowTranslucentNavigation", "true");
      setOrAdd("android:windowDrawsSystemBarBackgrounds", "true");
    }

    return config;
  });
};
