/* Furniture board: live data from the team's Google Sheet.
   Fill in the three links below to switch the furniture page from sample listings to real ones.
   Leave csvUrl empty to keep showing the sample listings. */
window.HME_FURNITURE = {
  // Google Sheet: File > Share > Publish to web > choose the "Public" tab > Comma-separated values (.csv) > Publish
  csvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ReTjxmBH14k4TPaf6dK_W71izKhlNxixbuaCM0yXSt35J_0gRBwQeo7vSzsoUCm4OO-hKyakbKFB/pub?gid=1740663081&single=true&output=csv",
  // Google Sheet, Settings tab: the value next to "Request link template"
  requestTemplate: "https://docs.google.com/forms/d/e/1FAIpQLSdrPxP8cI3TVbH8V-E2_StDAnsAEMKONm_92heLwYIa1EfEfw/viewform?usp=pp_url&entry.1988327658=XLISTINGIDX&entry.907857815=xemailx%40harvard.edu",
  // Google Sheet, Settings tab: the value next to "Sell form link"
  sellFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSd3pn8juBckfLzrI_cP_YL-H6mK4yAJbZ0uYWHbtUWu33MX1Q/viewform"
};
