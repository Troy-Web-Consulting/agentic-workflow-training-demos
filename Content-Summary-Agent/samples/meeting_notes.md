# Product Team Sync - March 10, 2026

Attendees: Sarah Chen (PM), John Rivera (Engineering Lead), Priya Patel (Design),
Marcus Thompson (QA), Lisa Wong (Marketing), David Kim (Backend Dev)

Started at 2:03pm (Sarah was a few minutes late, traffic on I-90)

## Discussion

Sarah kicked things off talking about Q2 planning. She mentioned the board meeting went well last week - revenue up 23% YoY which is great. Oh and apparently the office coffee machine is getting replaced next week, finally!!

John brought up the API migration timeline. He said the team has been working on moving from REST to GraphQL for the customer-facing endpoints. Current estimate is 6 weeks but could stretch to 8 if we hit issues with the legacy payment integration. He's worried about the payment service specifically - it's running on Node 14 which is EOL. David agreed and said he's already started looking into upgrading it but needs to coordinate with the payments team at Stripe. John will handle reaching out to Stripe's developer relations team by end of week.

Priya showed the new dashboard mockups. Everyone seemed to like them, though Marcus raised a concern about the data table on the analytics page - said it might be hard to test with the dynamic filtering. Lisa asked if we could add export-to-PDF for the reports section. After some back and forth, we agreed to add PDF export to the V2 release, not V1. We're going with Option B for the navigation layout (sidebar instead of top nav).

Marcus mentioned the regression test suite is taking 45 minutes to run now. He wants to parallelize it. John said we can allocate 2 sprint points for that next sprint. We agreed to prioritize test parallelization in Sprint 14.

There was a long tangent about whether to use Datadog or Grafana for monitoring. No conclusion reached - John will set up a separate meeting to evaluate both tools. Lisa mentioned she used Grafana at her last company and liked it, for what it's worth.

David raised a security concern - he found that the user session tokens aren't being rotated properly. Some tokens are valid for 30 days when they should expire after 24 hours. Sarah said this needs to be fixed ASAP and asked David to file a P1 ticket. David will have a fix ready for code review by Wednesday.

Budget discussion: we need to decide on the cloud infrastructure spend for Q2. Current run rate is $47K/month on AWS. Sarah thinks we can optimize to $38K if we right-size the EC2 instances and move some workloads to Lambda. She'll put together a cost analysis by Friday.

Lisa gave a quick marketing update - the blog post about our new API features got 12K views last week. She wants engineering to contribute a technical deep-dive post. John volunteered Priya to write it (Priya did not look thrilled). We need the draft by March 20th.

Meeting ended at 3:15pm. Next sync is Thursday same time.

Random note: Marcus's birthday is next Tuesday, Sarah is organizing a surprise lunch.
