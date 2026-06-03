function TranslateInit() {
  if (!window.__GOOGLE_TRANSLATION_CONFIG__) {
    return;
  }
  new google.translate.TranslateElement({
    pageLanguage: "es",
  });
}
