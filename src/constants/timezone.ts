// M8.5: canonical IANA identifiers straight from the runtime rather than a
// hand-maintained list — both Node 22 (server/validation) and every modern
// browser (the <select> in change-password-form's sibling, personal-info
// form) implement `Intl.supportedValuesOf`, so this guarantees the select's
// options and the server's validation always agree on exactly the same set,
// with zero maintenance as the IANA database itself updates.
export const SUPPORTED_TIMEZONES: string[] = Intl.supportedValuesOf("timeZone");
