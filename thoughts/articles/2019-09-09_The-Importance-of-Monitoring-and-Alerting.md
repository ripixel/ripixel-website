_This thought was first published on the [DVELP blog](https://dvelp.co.uk/articles/monitoring-and-alerting) - but it was still written by me!_

We all know that monitoring and alerting are important, right? But just _how_ important do we really think that? How much do we show that in what we do?

## What happened?

This is a story about an experience I had at a previous company, where I had the pleasure of being at least partially responsible for the system going down, and what we learned.

As some scene-setting - we had to implement a service that would be accessed anytime a user visited the site. I did the work, got it reviewed, tested, and hey-presto, got it live. More testing, ensure nothing went bang, and went home.

The next morning, I return to work, and all is well. About 3 hours in the site goes down. _Panic!_ Time to follow the steps...

1. Who deployed last? - _Not me!_
2. What big changes have we made recently? - _I did something yesterday, but everything's been fine for 24 hours, it can't be me!_
3. Check the logs - _"Cannot access the service that you implemented"_
4. _Gulp._

## How did we fix it?

For the purpose of this story, this is actually not important (although obviously the initial fix was we just rolled back to pre-my-change). What is important is _how did we get here_.

## So, how did we get here?

### The Service

First thing's first - let's have a look at the monitoring that was in place on the service I was calling:

![alt text](https://dvelp-production.s3.amazonaws.com/uploads/image/file/176/x_large_1568038815-tol_service_initial.PNG "Service - Initial")

Everything looks fine! Let's check the whole view:

![alt text](https://dvelp-production.s3.amazonaws.com/uploads/image/file/177/x_large_1568038850-tol_service_final.PNG "Service - Final")

Oh dear. So, the service was getting warmer and warmer, until it reached 100% usage and any subsequent requests stopped being served, failed, and the site calling it fell over.

### The Site

Ok, so the service got overloaded. Let's have a look at the number of calls we were making... _oh. There is no monitoring on the number of calls we were making._

Ok, let's assume we did have that monitoring in place - what is the expected number of calls?

![alt text](https://dvelp-production.s3.amazonaws.com/uploads/image/file/178/x_large_1568038873-tol_site_expected.PNG "Site Expected")

Great - now let's have a look at the actual:

![alt text](https://dvelp-production.s3.amazonaws.com/uploads/image/file/177/x_large_1568038850-tol_service_final.PNG "Site Actual")

I think that would do it, yes. Overloading the service with around 50x the expected calls (that's already taking into account the headroom planned).

## Time to assign blame

There's a common misunderstanding with coding, in that the coder themself is to blame when things go wrong. That's not _incorrect_, but it's certainly not the whole story. Let's have a look at who else was involved in that deployment:

- The developer who created the change
- The developers who reviewed and approved the change
- The testers who missed the issue
- The engineering manager who approved the approach
- The team responsible for the service being called

So it's not so simple. Software development is a team effort, so there's never a single person to blame.

## What did we learn?

To quote the product owner:

> Why the hell didn't we know about this earlier, before it became an issue?

It's the only question that really matters in this instance. We had monitoring for the service, but no alerting set up for when it was getting too warm. We had no monitoring in place at all for the number of calls being made, and therefore no alerting.

So, some takeaways from my (traumatic) trip down memory lane about how I took down a site:

- Data is only important if you use it
- Graphs and alerts are really boring until _they save you_
- Give developers time to make "of no immediate value" things like monitoring and alerting, and make it part of any Acceptance into Service checklists
