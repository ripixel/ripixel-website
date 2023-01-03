If you use [Firebase](https://firebase.google.com/) to host your website, you may have seen the new [Preview Channels](https://firebase.google.com/docs/hosting/test-preview-deploy?authuser=0&hl=en#preview-channels) functionality has entered Beta and wondered - what on earth is that?

I've recently been using [Renovate](https://github.com/renovatebot/renovate) to automatically handle dependency updates, and wanted a way to preview the automatically proposed changes without having to merge into staging and do that dance. Preview channels to the rescue!

This guide combines a few ideas:
 - Setting up preview channels
 - Grabbing the relevant URL for the just-deployed preview channel
 - Regex shenanigans
 - Posting a comment to a relevant GitHub PR

## What is Firebase?

Let's start at the beginning - Firebase is Google's free-to-use (up to a point) suite of Web application tools. Most notably (along with Firestore) is its hosting capability, which means given a set of files you can deploy a static application incredibly easily (note: there are also cloud functions and edge services to make it not static, but that's outside the realms of this post).

## How do you get set up with Firebase?

As a quick start, you can't get better than the [Get started with Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart?authuser=0&hl=en) page from Google which explains all the basics of getting set up with Firebase Hosting, that I won't repeat here as there's nothing I can add!

## What is CircleCI?

[CircleCI](https://circleci.com/) is deployment pipeline (aka CI/CD) platform, which is also free-to-use up to a point (with very generous allowances for Open Source projects), and is my pipeline of choice due to its usage in Enterprise spaces, which means using it in personal projects grants me experience with things I do for "proper work".

It also helps that it's fantastically configurable, fast, and y'know... free!

## How do you get set up with CircleCI?

CircleCI has a great [Getting started](https://circleci.com/docs/getting-started/) guide which should get you through the initial hoops of getting your repository building from GitHub, with some great initial templates for whatever your application needs.

This website uses it, so if you want to just see the output and you're confident with Continuous Deployment pipelines, go check out its [CircleCI config](https://github.com/ripixel/ripixel-website/blob/master/.circleci/config.yml).

## What are Firebase Preview Channels?

Firebase preview channels create a temporary version of your hosted application with some identifier available so you can "preview" any proposed changes. For example with this website, I build any PRs I raise on GitHub to a preview channel so I can check everything is working as expected and nothing has broken silently in the build process.

So, when I raise a PR CircleCI builds it, and asks Firebase to deploy it to a preview channel. I then post this URL back to GitHub so I can see it for real!

![screenshot of github comment on a pull request](/deploying_to_firebase_gh_comment.png "Look ma, a Github comment!")

## How to configure Firebase preview channels?

So now you've followed the [Get started with Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart?authuser=0&hl=en) and [Getting started [with CircleCI]](https://circleci.com/docs/getting-started/) guides, and you've got a deployment pipeline for your application - well done! Now let's do something cool.

### Configure your CI/CD

Your CI/CD of choice should have a capability to ensure some steps only get run under certain conditions. For example on CircleCI for this very website, I have:

```yaml
# YAML

# Jobs not listed for brevity

workflows:
  build_and_deploy:
    jobs:
      - install_deps
      - lint:
          requires:
            - install_deps
      - build_dev:
          filters:
            branches:
              ignore: master
          requires:
            - install_deps
      - build_prod_with_version:
          filters:
            branches:
              only: master
          requires:
            - install_deps
      - deploy_to_firebase_prod:
          filters:
            branches:
              only: master
          requires:
            - lint
            - build_prod_with_version
      - deploy_to_firebase_preview:
          filters:
            branches:
              ignore:
                - master
                - staging
          requires:
            - lint
            - build_dev
      - deploy_to_firebase_stg:
          filters:
            branches:
              only: staging
          requires:
            - lint
            - build_dev
```

This config means that if I merge to these different branches, then these jobs run:
  + merge to `master`:
    - `install_deps`
    - `lint`
    - `build_prod_with_version`
    - `deploy_to_firebase_prod`
  + merge to `staging`:
    - `install_deps`
    - `lint`
    - `build_dev`
    - `deploy_to_firebase_stg`
  + merge to any other branch:
    - `install_deps`
    - `lint`
    - `build_dev`
    - `deploy_to_firebase_preview`

As an example of a non-preview deploy, the `deploy_to_firebase_prod` step is super simple:

```yaml
#YAML

jobs:
  deploy_to_firebase_prod:
    executor: node-project
    steps:
      - checkout
      - restore_cache: # special step to restore the dependency cache
          key: dependency-cache-{{ checksum "package-lock.json" }}
      - restore_cache: # restore the /public folder and associated deploy files
          key: deploy-cache-{{ .Environment.CIRCLE_WORKFLOW_ID }}
      - run:
          name: Deploy to Firebase Production Hosting
          command: ./node_modules/.bin/firebase deploy --token "$FIREBASE_TOKEN" --only hosting:production
```

First off this step restores some caches from the `install_deps` and `build_prod_with_version` steps, before attempting to deploy to Firebase. You can see that I have to pass in `--token "$FIREBASE_TOKEN"` to authenticate (so I've added `FIREBASE_TOKEN` as an environment variable for the pipeline), as well as `--only hosting:production` to let Firebase know which platform I want to deploy to (as I have `production` and `staging` configured).

I also prefer to use the project-installed version of firebase rather than do any `npm i -g firebase-tools` shenanigans, as it keeps the firebase version locked with the rest of the project, which prevents unexpected problems if firebase were to upgrade unexpectedly.

### Deploying to Firebase Preview channel

So you're now deploying to Firebase for your "normal" deployments - production, staging, whatever. But let's get preview channels enabled! Let's see what a simple step might look like:

```yaml
jobs:
  deploy_to_firebase_preview:
    executor: node-project
    steps:
      - checkout
      - restore_cache: # special step to restore the dependency cache
          key: dependency-cache-{{ checksum "package-lock.json" }}
      - restore_cache: # restore the /public folder and associated deploy files
          key: deploy-cache-{{ .Environment.CIRCLE_WORKFLOW_ID }}
      - run:
          name: Deploy to Firebase Preview Channel
          command: ./node_modules/.bin/firebase hosting:channel:deploy $CIRCLE_BRANCH --token "$FIREBASE_TOKEN"
```

Great, we've now got preview channels deploying - it really is that easy! As the "unique ID" we're using the `$CIRCLE_BRANCH` so that we don't create endless preview channels if the same branch gets updated. Note that you don't need the `--only hosting:x` parameter, as preview channels are _always_ only for hosting.

### Posting a comment back to GitHub

But what if we want to post a GitHub comment on the PR that accompanies the branch? Then as an extra `run` step we could add:

```yaml
      - run:
          name: Post Github PR Comment
          command: |
            sudo apt-get install jq

            channels=$(./node_modules/.bin/firebase hosting:channel:list)
            circle_branch_replaced=$(echo $CIRCLE_BRANCH | sed "s/\//-/")
            regex='(https:\/\/[a-z0-9-]*--'"${circle_branch_replaced:0:39}"'-[a-z0-9-]*.web.app)'
            [[ $channels =~ $regex ]] && url=${BASH_REMATCH[0]}

            if [ $(echo $url | jq length) -eq 0]; then
              url="Unable to get URL - check Firebase console"
            fi

            pr_response=$(curl --location --request GET "https://api.github.com/repos/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/pulls?head=$CIRCLE_PROJECT_USERNAME:$CIRCLE_BRANCH&state=open" \
            -u $GH_USER:$GH_TOKEN)

            if [ $(echo $pr_response | jq length) -eq 0 ]; then
              echo "No PR found to update"
            else
              pr_comment_url=$(echo $pr_response | jq -r ".[]._links.comments.href")
            fi

            curl --location --request POST "$pr_comment_url" \
            -u $GH_USER:$GH_TOKEN \
            --header 'Content-Type: application/json' \
            --data-raw '{"body": "Successfully deployed to Firebase preview channel! Available at: '"$url"'"}'
```

This step does a few things, and begins with some set up and variable assigning.

`sudo apt-get install jq` installs the `jq` package to enable some functions we want to use in the script.

`channels=$(./node_modules/.bin/firebase hosting:channel:list)` assigns a variable called `$channels` with a value of all the different preview channels that are currently live that Firebase is tracking. Assuming this command is run after a successful `firebase hosting:channel:deploy` run, this will include the most recently-deployed channel.

`circle_branch_replaced=$(echo $CIRCLE_BRANCH | sed "s/\//-/")` is replacing any forward slashes found in `$CIRCLE_BRANCH` with dashes, just like firebase will do if you pass in anything with slashes.

`regex='(https:\/\/[a-z0-9-]*--'"${circle_branch_replaced:0:39}"'-[a-z0-9-]*.web.app)'` creates a regex that looks for the URL that looks like the channel you've just deployed. Firebase also only uses the first 40 characters of the ID (which is what `"${circle_branch_replaced:0:39}"` is doing). So our regex ends up something like:

```
(https:\/\/[a-z0-9-]*--mybranch-something-[a-z0-9-]*.web.app)
```

Don't forget the parenthesis around it so you create a regex capture group!

`[[ $channels =~ $regex ]] && url=${BASH_REMATCH[0]}` uses the `$channels` and `$regex` variables we've defined above, and runs the regex against the channel list. It then assigns a variable called `$url` with the matched URL in a capture group.

The `if [ $(echo $url | jq length) -eq 0]; then` statement checks that we've actually found a URL by asserting the length of `$url` is greater than zero - if it's not, we assign an error message to the `$url` variable.

Next up, we assign a curl target to the variable `$pr_response`. For this we need to create two environment variables for our pipeline: `GH_USER` and `GH_TOKEN`. `GH_USER` is your GitHub username, and `GH_TOKEN` is a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) with read/write permissions for pull requests on the associated repository. We don't need to worry about any of those variables used prefixed with `$CIRCLE_` because they're all available to us for free!

We then check if we found a relevant PR using the `if [ $(echo $pr_response | jq length) -eq 0 ]; then` block, using `jq` to check the length as before. If we find one, we assign `$pr_comment_url` the URL we need to hit to add a comment.

Finally, we perform the `curl` request to add the comment, using:

```bash
curl --location --request POST "$pr_comment_url" \
  -u $GH_USER:$GH_TOKEN \
  --header 'Content-Type: application/json' \
  --data-raw '{"body": "Successfully deployed to Firebase preview channel! Available at: '"$url"'"}'
```

Be very careful when constructing your `--data-raw` - the way variable interpolations work in bash is confusing, so be sure to terminate your strings either side of it to not have any weirdness. You can see my doing this by doing:

```bash
# Bash will concatenate strings if side-by-side
some_var=hello
result='some "text" with double-quotes in it '"$some_var"' more text'
echo $result
# some "text" with double-quotes in it hello more text
```

Et voila! Putting it all together we have:

```yaml
jobs:
  deploy_to_firebase_preview: # deploy the project to preview channel - SHOULD ONLY BE RUN ON PR BRANCHES
    executor: node-project
    steps:
      - checkout
      - restore_cache: # special step to restore the dependency cache
          key: dependency-cache-{{ checksum "package-lock.json" }}
      - restore_cache: # restore the /public folder and associated deploy files
          key: deploy-cache-{{ .Environment.CIRCLE_WORKFLOW_ID }}
      - run:
          name: Deploy to Firebase Preview Channel
          command: ./node_modules/.bin/firebase hosting:channel:deploy $CIRCLE_BRANCH --token "$FIREBASE_TOKEN"
      - run:
          name: Post Github PR Comment
          command: |
            sudo apt-get install jq

            channels=$(./node_modules/.bin/firebase hosting:channel:list)
            circle_branch_replaced=$(echo $CIRCLE_BRANCH | sed "s/\//-/")
            regex='(https:\/\/[a-z0-9-]*--'"${circle_branch_replaced:0:39}"'-[a-z0-9-]*.web.app)'
            [[ $channels =~ $regex ]] && url=${BASH_REMATCH[0]}

            if [ $(echo $url | jq length) -eq 0]; then
              url="Unable to get URL - check Firebase console"
            fi

            pr_response=$(curl --location --request GET "https://api.github.com/repos/$CIRCLE_PROJECT_USERNAME/$CIRCLE_PROJECT_REPONAME/pulls?head=$CIRCLE_PROJECT_USERNAME:$CIRCLE_BRANCH&state=open" \
            -u $GH_USER:$GH_TOKEN)

            if [ $(echo $pr_response | jq length) -eq 0 ]; then
              echo "No PR found to update"
            else
              pr_comment_url=$(echo $pr_response | jq -r ".[]._links.comments.href")
            fi

            curl --location --request POST "$pr_comment_url" \
            -u $GH_USER:$GH_TOKEN \
            --header 'Content-Type: application/json' \
            --data-raw '{"body": "Successfully deployed to Firebase preview channel! Available at: '"$url"'"}'
```

And now we have PRs (well, any branches that aren't `master` or `staging`) deploying to preview channels and posting back to the relevant PR with a comment to view the changes.

To see the entire build step for this website, check out its [CircleCI config](https://github.com/ripixel/ripixel-website/blob/master/.circleci/config.yml). It's not doing anything crazy - install dependencies, lint the repo, build the site, and deploy!
