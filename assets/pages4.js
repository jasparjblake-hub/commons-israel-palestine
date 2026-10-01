/* Findings, Method and Downloads pages. */
"use strict";

(() => {
  const { el, load, fmtDate, fmtInt, route } = App;
  const panel = (...kids) => el("section", { class: "panel stack" }, ...kids);
  const p = t => el("p", null, t);
  const small = t => el("p", { class: "small" }, t);
  const tag = (t, cls) => el("span", { class: "tag " + (cls || "") }, t);
  const ul = items => el("ul", { class: "claim-list" }, items.map(i => el("li", null, i)));
  const PREREG = () => tag("pre-registered", "checked");
  const EXPL = () => tag("exploratory");

  // Odds-ratio rows drawn as likely ranges around 1 ("no difference").
  function orChart(rows) {
    const lo = 0.94, hi = 1.18, pos = v => (100 * (v - lo) / (hi - lo)).toFixed(2) + "%";
    const ticks = [0.95, 1, 1.05, 1.1, 1.15];
    return el("div", { class: "orchart" },
      el("div", { class: "or-axis", "aria-hidden": "true" }, el("span"),
        el("div", { class: "or-scale" }, ticks.map(t => el("span", { style: "left:" + pos(t) }, t === 1 ? "1 (no difference)" : t.toFixed(2))))),
      rows.map(r => {
        const holds = r[1] > 1;   // the whole likely range above 1
        return el("div", { class: "or-row" },
          el("div", { class: "small" }, r[3], el("span", { class: "xs muted", style: "display:block" }, r[4])),
          el("div", { class: "or-track", role: "img", "aria-label": r[3] + ": " + r[0].toFixed(3) + ", likely range " + r[1].toFixed(3) + " to " + r[2].toFixed(3) },
            el("span", { class: "or-one", style: "left:" + pos(1) }),
            el("span", { class: "or-rng bg-" + r[5], style: `left:${pos(r[1])};width:calc(${pos(r[2])} - ${pos(r[1])})` }),
            el("span", { class: "or-pt " + (holds ? "bg-" + r[5] : "hollow"), style: "left:" + pos(r[0]) })),
          el("span", { class: "small num" }, r[0].toFixed(3), el("span", { class: "xs muted", style: "display:block" }, r[1].toFixed(3) + "–" + r[2].toFixed(3))));
      }));
  }

  // ================================================================ FINDINGS
  route("findings", async () => el("div", { class: "stack-lg reading" },
    el("div", { class: "stack" },
      el("h1", null, "Findings"),
      p("I set out to ask what predicts where an MP lands on this issue, and when MPs move. The answers below run from the clearest to the least certain. One test was registered in advance, before any seat data was opened; it is marked pre-registered. Everything else was decided after earlier results had been seen, so it is marked exploratory and should be read as description."),
      p("None of this shows why an MP said what they said, and none of it describes what voters or communities think. The full set of checks behind each result is on the Method page.")),

    panel(el("h2", null, "1. Party is the biggest divide"), el("div", null, EXPL()),
      p("In the 2024 Parliament, 71% of Labour MPs' on-topic contributions made Claim 1 and 20% made Claim 2. For Conservative MPs the figures were 38% and 62%. Before the 2024 election they were 82% and 33% for Labour, and 41% and 47% for the Conservatives."),
      p("Early Day Motions show the same split. Every Liberal Democrat MP elected in 2024 signed motions calling for arms restrictions and for recognition. About one in five Labour backbenchers did, and no Conservative MP did. In speeches since July 2024, none of the 60 Conservative MPs who spoke on the subject was recorded calling for arms restrictions."),
      p("Once party is taken into account, the make-up of an MP's seat shows no clear link with either claim across the House as a whole. Within a party there is more to find, and almost all of it is within Labour, the only party with enough MPs to compare."),
      el("p", { class: "small" }, el("a", { href: "#parties" }, "Compare parties"))),

    panel(el("h2", null, "2. The seat explains part of the rest, but the result is fragile"), el("div", { class: "row" }, PREREG(), EXPL()),
      p("The pre-registered test looked at the 102 Labour MPs who spoke on the subject at least five times after July 2024. Those representing seats with a larger Muslim population were more likely to be recorded calling for UK recognition of a Palestinian state before the UK recognised it. A seat where 20% of residents are Muslim was predicted to be about 35 points more likely to have such an MP than a seat at 2%, with a likely range of 7 to 58 points. Child poverty and the size of the 2024 majority showed no clear link."),
      p("Whether a Gaza-focused candidate stood against the MP in 2024 added nothing once Muslim share was known. The two overlap so much (a correlation of 0.70) that the data can't tell them apart."),
      p("The result does not survive every check. Ministers tend to sit in seats with a smaller Muslim population (a median of 2%, against 10% for backbenchers), and ministers are not recorded calling for changes to Government policy. Among the 84 backbenchers alone, the pattern points the same way but is too uncertain to call. Early Day Motions signed by 266 Labour backbenchers give a similar picture: a clear link for arms-restriction motions, and a slightly weaker one for recognition that falls just short."),
      orChart([
        [1.086, 1.015, 1.163, "Speeches: called for recognition", "Pre-registered test, 102 Labour MPs", "rec"],
        [1.056, 0.983, 1.135, "Speeches: called for recognition", "Backbenchers only, after the hand check, 84 MPs", "rec"],
        [1.000, 0.948, 1.054, "Speeches: called for arms restrictions", "Same 102 MPs", "arms"],
        [1.040, 0.994, 1.089, "Motions: signed one calling for recognition", "266 Labour backbenchers", "rec"],
        [1.055, 1.008, 1.104, "Motions: signed one calling for arms restrictions", "266 Labour backbenchers", "arms"]]),
      el("p", { class: "xs muted" }, "Each row shows how the odds of an MP making the call change for each extra percentage point of Muslim population in the seat. Above 1 means more likely; 1 means no difference. The bar is the likely range (95%). A filled dot means the whole range sits above 1; a hollow dot means it reaches 1 or below. All rows also allow for child poverty and the 2024 majority."),
      p("Taken together, there is a modest link pointing the same way in three of the four measures. It is smaller among backbenchers and clears the bar in only some measures. It is an association, and it cannot say whether seats chose MPs who already held these views or MPs responded to their seats."),
      p("The project also set out to test Jewish population share, but only if at least 50 seats in Great Britain were above 1%. Only 35 are, so it was not tested. A descriptive comparison of those seats was too small to support any conclusion."),
      el("p", { class: "small" }, el("a", { href: "#seats" }, "Explore seats"), " · ", el("a", { href: "#method" }, "Every check on this result"))),

    panel(el("h2", null, "3. Government roles shape what is recorded"), el("div", null, EXPL()),
      p("Since July 2024, Labour MPs speaking as ministers made Claim 1 in 63% of their on-topic contributions and Claim 2 in 22%. Labour backbenchers made them in 84% and 18%. After a hand check of every case, none of the 18 Labour ministers in the main group is recorded calling for arms restrictions or recognition. The few calls the model had recorded for them were statements of Government policy."),
      p("The same pattern held under the previous Government. Conservative ministers before July 2024 made Claim 1 in 43% of contributions and Claim 2 in 39%. In both periods, ministers' Claim 1 share sat between that of their own backbenchers and that of the opposition frontbench. Ministers and whips also do not sign Early Day Motions."),
      el("p", { class: "small" }, el("a", { href: "#parties" }, "See claims by party and role"))),

    panel(el("h2", null, "4. The record shifted at particular moments"), el("div", null, EXPL()),
      p("Across the whole House, the share of on-topic contributions making Claim 2 fell from 45% in the months after 7 October 2023 to 20% after September 2025. The share making Claim 1 rose from 55% to 71%. In October 2023 itself, Claim 2 was made more often than Claim 1."),
      p("The same 60 MPs, compared before and after the 2024 election, made Claim 2 less often by a median of 15 points, about as much as the House as a whole. Their Claim 1 share did not change; most were already making it in nearly every contribution. The House's rise in Claim 1 came mainly from changes in who sat and who spoke."),
      p("First calls for recognition came in bursts. Among the 163 MPs who spoke on the subject at least five times after July 2024, three sitting days, 29 April, 6 May and 10 June 2025, account for 40% of first calls. On 10 June a minister made a statement announcing UK sanctions on two Israeli ministers over settler violence, and 14 of those MPs made their first recorded call for recognition that day, many pointing to an international conference due the following week. Counting every MP, however often they spoke, 20 made their first call that day. A motion calling for recognition was tabled two days later. First calls for arms restrictions were spread more evenly."),
      p("Timing could in principle show whether MPs held their views from the start or arrived at them later. Most MPs who called for either had spoken on the subject before, without making the call. But recognition only became a live question in 2025, so this does not settle it."),
      el("p", { class: "small" }, el("a", { href: "#timeline" }, "See the timeline"))),

    el("p", { class: "note" }, "All figures come from automated coding checked against samples coded by hand, with the accuracy stated on the Method page. Where a hand check corrected a code, both figures are reported. The pre-registered result is reported as it was first run, with corrections beside it.")));

  // ================================================================ METHOD
  route("method", async () => {
    const [meta, prompt] = await Promise.all([load("data/meta.json"), load("data/prompts.json")]);
    const t = meta.totals;
    const section = (title, ...kids) => panel(el("h2", null, title), ...kids);
    const tbl = (caption, cols, rows) => el("div", { class: "table-wrap" }, Charts.table(caption, cols, rows));
    return el("div", { class: "stack-lg reading" },
      el("div", { class: "stack" },
        el("h1", null, "Method"),
        p("How the data was collected, coded and checked, and what went wrong along the way. My aim throughout was to measure what was said without taking a side, so most of the work went into checking the measurement."),
        el("p", { class: "small muted" }, "Contents: who made this · the data · why not count keywords · the coding · how accurate it is · safeguards · every check on the seat result · what changed course · limits · what was not done · sources")),

      section("Who made this",
        p("I'm Jasper Blake, and this is an independent project. It is not funded and has no connection to any party, campaign or organisation involved in the issue."),
        p("I built the analysis and this site with help from Claude, an AI assistant made by Anthropic, which wrote the code. The hand-coding and the predictions are my own."),
        el("p", null, "Contact: ", el("span", { class: "mono", style: "user-select:all" }, "jasparjblake@gmail.com"))),

      section("The data",
        ul([
          "Every spoken contribution in the House of Commons Chamber from the first sitting after 7 October 2023 (16 October) to " + fmtDate(meta.window.last) + ", taken from Hansard. Westminster Hall, committees, written questions and the House of Lords are not included.",
          "Contributions were found in two ways: by keyword (Gaza; Israel, Israeli, Israelis; Palestine, Palestinian, Palestinians; West Bank), and by taking every contribution in a debate whose title named the subject, so that speeches without a keyword were not missed. Each word form was searched separately because Hansard's search ignores wildcards.",
          "That gave 10,718 contributions. Removing the Speaker's and deputies' interventions and procedural text left " + fmtInt(t.scorable) + ". The model judged " + fmtInt(t.on_topic) + " of them to be about Israel and Palestine.",
          "Each contribution carries the MP's party, seat and role (minister, opposition frontbench or backbench) on the day it was made, from Parliament's own member records.",
          "Seat figures come from the 2021 census (2022 in Scotland), child poverty statistics and the 2024 election results, all on the boundaries used from July 2024 and all from the House of Commons Library. Northern Ireland's census asked a different religion question, so its seats have no religion figures. Speeches from before July 2024 are never compared with seat figures, because the boundaries changed.",
          "Early Day Motions came from Parliament's motions service: " + t.edms_counted + " motions on the subject and their signatures.",
          "The ten major news days come from the GDELT Project's count of UK online coverage, using a rule fixed before any comparison with the Commons."])),

      section("Why not count keywords",
        p("The first plan was to count two balanced lists of words, one for each claim. Testing individual words by hand showed why that would not work. On “genocide”, only 40% of uses were the MP making the charge in their own voice; more were MPs reporting what others had said. Only 60% of uses of “7 October” served a security argument, and a third of the “antisemitism” contributions checked were about domestic matters unrelated to the conflict. Dropping just those last two words moved the overall balance of the lists from one side of the midpoint to the other. The lists also matched nothing at all in 79% of contributions."),
        p("So the main measure became a model that reads each contribution in full. The keyword lists were kept as a baseline, but the planned comparison between the two methods was not completed (see what was not done).")),

      section("The coding",
        p("Each on-topic contribution was read by claude-sonnet-5, a fixed version of Anthropic's model. It was shown the debate title, the date and the text, and was not told who was speaking. (Some MPs name their own constituency, which can't be removed without damaging the text.)"),
        p("It judged two claims separately, giving each one of five codes: made in the speaker's own voice, reported as someone else's view, left to a court or other process, disputed, or not made. Only the first counts in the figures on this site."),
        ul([el("span", null, el("b", null, "Claim 1: "), "Israeli or allied conduct is harming Palestinians or breaching legal or humanitarian standards."),
            el("span", null, el("b", null, "Claim 2: "), "Hamas or allied conduct is harming Israelis, or Israel has security needs or a right to act.")]),
        p("The two definitions were written to the same length, with the same number of examples and the same rules. The model also recorded whether the speaker called for or argued against arms restrictions, recognition, a ceasefire and proscription. Proscription is not used on the site because it could not be checked properly."),
        p("Claims were coded with version 1.1 of the instructions. The calls were re-coded with version 1.2, which fixed a fault described below. Both are published here in full."),
        el("details", { class: "how" }, el("summary", null, "Instructions given to the model, version 1.2 (used for the calls)"),
          el("pre", { class: "prompt" }, prompt.v12)),
        el("details", { class: "how" }, el("summary", null, "Version 1.1 (used for topic and claims). Its first two tasks are word for word the same as version 1.2; only the third task differs."),
          el("pre", { class: "prompt" }, prompt.v11_task3))),

      section("How accurate it is",
        p("Samples were coded by hand without seeing the model's answers, and the two were compared. Agreement on the claims, after allowing for agreement by chance, was 0.73 for Claim 1 and 0.62 for Claim 2 (a measure called kappa, where 0.6 to 0.8 is usually read as substantial). Agreement on whether a contribution was on topic was 0.69."),
        tbl("Hand-checking rounds", [["Round"], ["Date"], ["What was checked"], ["Main result"]], [
          ["1", "8 Sep 2026", "200 random contributions", "Agreement on Claim 1 was higher than on Claim 2. The model found Claim 2 in 69 items, the hand-coding in 42."],
          ["2", "9 Sep 2026", "50 new contributions", "The Claim 2 gap narrowed. The topic definition was tightened."],
          ["Calls", "25 Sep 2026", "80 contributions, mostly ones the model coded as calls", "Only 48% of arms-restriction calls and 60% of recognition calls were confirmed. The instructions were fixed (version 1.2)."],
          ["Claim 2 check", "28–29 Sep 2026", "80 contributions designed to test Claim 2", "84% of the model's Claim 2s and 87% of its Claim 1s were confirmed; it missed very few of either."],
          ["Names", "30 Sep 2026", "Every recorded call by an MP who might be named, and every Labour minister's", "7 recorded positions were wrong, 6 of them ministers describing Government policy."],
          ["Motions", "30 Sep 2026", "57 motions", "Agreed on 170 of 171 codes."]]),
        p("After the fix, 94% of the recognition calls the model records are real, and it catches 94% of real ones. For arms restrictions the figures are 71% and about 77%. The fix could only remove false calls, not find missed ones, so these catch rates are the ones measured before it."),
        p("Against the Claim 2 check, the model records about 11% more Claim 1 and 17% more Claim 2 than a person would. Because both are over-counted by similar amounts, the balance between them barely moves."),
        p("I also checked whether the model gives the same answer twice. It coded the same 50 contributions a second time with identical settings. Whether Claim 1 was made in the speaker's own voice came out the same in 49 of the 50, and Claim 2 in 47. The arms-restriction and recognition codes were the same in all 50, and the ceasefire code in 48. The changes in Claim 2 went both ways, two from made to not made and one the other way. With only 50 contributions the true rates could be a few points lower: for Claim 2, anywhere from 84% to 98%."),
        p("The Claim 2 checks have a history that should be read in full. In the first round the hand-coding found far fewer Claim 2s than the model did, including statements such as “Israel has a right to defend itself”, which fit the definition almost word for word. A later round seemed to point the other way. The check designed to settle it found that the first-round gap was mainly in the hand-coding. My own explanation, given after I had seen the results, is that I had not been following the definitions closely enough at the start. That affected Claim 2 more than Claim 1, and it is reported here as it happened.")),

      section("Safeguards",
        ul([
          "Before each test I wrote down what I expected. The directions were mostly right and the sizes often were not: I expected 60 seats to have a Jewish population above 1% (there were 35), and 60% of Labour backbenchers to have signed a motion on the subject (31% had). Two early tests, of the model's agreement with the hand-coding, were run before I had written a prediction.",
          "The outcomes and the seat test were fixed before any seat data was opened. The test was then registered in advance, with its three models, five extra checks and the rules for reading them. Later changes were made by dated amendment.",
          "Samples, hand-codes and other key files were locked with a digital fingerprint before anything was compared, so they could not be changed afterwards without it showing.",
          "When I coded samples by hand I never saw the model's answers, and the model never saw who was speaking.",
          "Where a check found a mistake, the corrected figure is shown beside the original, never in its place.",
          "The models were run on two separate computers and gave identical results."])),

      section("Every check on the seat result",
        p("The pre-registered test is the first row. Every later row was run afterwards, and they are all reported whatever they showed. The figures are odds ratios per percentage point of Muslim population: above 1 means more likely, and the result counts as holding only if the whole likely range is above 1."),
        tbl("Checks on the seat result", [["Check"], ["Odds ratio (likely range)", 1], ["Holds?"], ["Type"]], [
          ["Recognition, 102 Labour MPs (the test)", "1.086 (1.015–1.163)", "Yes", "Pre-registered"],
          ["Arms restrictions instead", "1.000 (0.948–1.054)", "No", "Registered extra check"],
          ["All Labour MPs who spoke, allowing for how often", "1.043 (0.995–1.094)", "No", "Registered extra check"],
          ["Only MPs who made the call twice or more", "1.063 (0.997–1.132)", "No", "Registered extra check"],
          ["Only MPs who spoke 20 or more times (26 MPs)", "1.476 (1.065–2.044)", "Too few to read", "Registered extra check"],
          ["Labour and Liberal Democrat MPs together", "1.084 (1.016–1.156)", "Yes", "Registered extra check"],
          ["Allowing for whether the MP was a minister", "1.068 (0.995–1.147)", "No", "Added later"],
          ["After the hand check corrected 4 ministers' calls", "1.090 (1.020–1.166)", "Yes", "Correction"],
          ["After the hand check, backbenchers only", "1.056 (0.983–1.135)", "No", "Correction"],
          ["Allowing for ethnic minority share", "1.139 (1.018–1.273)", "Yes", "Added later"],
          ["Allowing for city or town", "1.097 (1.016–1.184)", "Yes", "Added later"],
          ["Allowing for degree-level share", "1.072 (0.989–1.160)", "No", "Added later"],
          ["Allowing for share of adults aged 18–34", "1.070 (0.998–1.148)", "No", "Added later"],
          ["Signed a recognition motion, 266 backbenchers", "1.040 (0.994–1.089)", "No", "Added later"],
          ["Signed an arms-restriction motion, 266 backbenchers", "1.055 (1.008–1.104)", "Yes", "Added later"]]),
        p("Not predicted, and reported as found: a larger 2024 majority went with more calls for arms restrictions in speeches and with signing both kinds of motion. The data can't say why."),
        p("The extra checks after the hand check were not all re-run with the corrected figures. The corrections affect 4 of the 102 recognition outcomes and 2 of the 102 arms outcomes, all of them ministers.")),

      section("What changed course",
        ul([
          "Keyword counting was dropped as the main measure (see above).",
          "The planned main outcome was calls for arms restrictions. It was switched to recognition, before any seat data was opened, because recognition calls were coded more accurately.",
          "Ceasefire was dropped as an outcome because the model recorded more than twice as many calls as the hand-coding did. Proscription was dropped because there were too few cases to check.",
          "An early finding that Labour ministers and backbenchers called for arms restrictions equally often turned out to be produced by the coding fault that version 1.2 fixed.",
          "The rule for picking major news days was revised twice, before any comparison with the Commons, because the first versions picked mostly weekends.",
          "A single score combining Claim 1 and Claim 2 was planned for one analysis and not run, because the two claims are never combined.",
          "A first estimate of the cost of the coding was four times too low. The whole project cost $55 in model fees."])),

      section("Limits",
        ul([
          "Patterns between seats and MPs are associations. They cannot show that a seat caused an MP's views, and they say nothing about individual voters.",
          "Being recorded making a call depends partly on how often an MP spoke. Only 1% of MPs who spoke once after July 2024 were recorded calling for arms restrictions, against 58% of those who spoke 20 or more times.",
          "Most codes are automated. A missed or wrong code can make an MP look unusual for their seat.",
          "I did all the hand-coding myself, so no second person has checked it.",
          "Motions can only show support for a call, because none opposed either one.",
          "Shares of contributions give more weight to MPs who speak often, and ministers speak most.",
          "Very few contributions (about 2%) report or dispute a claim rather than making it, so those codes are not analysed."])),

      section("What was not done",
        ul([
          "How MPs voted in divisions is not included.",
          "The keyword baseline was never scored, so the comparison between the two methods was not made.",
          "The plan included a run with Claim 1 and Claim 2 in swapped order in the instructions, to check that their order made no difference. It was not done."])),

      section("Sources and licences",
        p("Contains Parliamentary information licensed under the Open Parliament Licence v3.0. Census, child poverty and election data from the House of Commons Library, Office for National Statistics and National Records of Scotland, under the Open Government Licence. News coverage figures from the GDELT Project."),
        p("The compiled data on this site may be reused under the Creative Commons Attribution 4.0 licence, with credit to this project.")));
  });

  // ================================================================ DOWNLOADS
  route("downloads", async () => {
    const files = [
      ["mps.csv", "One row per MP (694): party, seats, on-topic contributions, claims made in each Parliament, recorded calls, motions signed and hand-check results."],
      ["contributions_coded.csv", "One row per on-topic contribution (7,781): date, debate, the MP's party and role on the day, every code with the quoted words, and a Hansard link. Full speech text is not included; follow the link."],
      ["seats.csv", "One row per seat (650): every seat figure used on the site, and the MP elected in 2024."],
      ["edms.csv", "The 138 on-topic Early Day Motions, with their codes and a link to each."],
      ["edm_signatures.csv", "Who signed each of those motions."],
      ["monthly_by_party_and_role.csv", "Monthly counts by party and role, behind the timeline."],
    ];
    return el("div", { class: "stack-lg reading" },
      el("div", { class: "stack" },
        el("h1", null, "Downloads"),
        p("The data behind this site, as CSV files that open in Excel or any spreadsheet program. Most codes were produced by the model and not checked by hand; the Method page gives their accuracy.")),
      panel(el("ul", { class: "dl-list" }, files.map(([f, d]) => el("li", null,
        el("a", { href: "downloads/" + f, download: f }, f), el("span", { class: "small muted" }, d))))),
      el("p", { class: "small" }, "Licence: the compiled data may be reused under Creative Commons Attribution 4.0, with credit to this project. It contains Parliamentary information licensed under the Open Parliament Licence v3.0."));
  });
})();
