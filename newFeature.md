This feature will allow reverse matching of live urls to the full content path.
For example in case of  "eplan" company website:
url like
www.eplan.com/de-en/services/onboarding-services/
will be mapped to the full contnt path:
/content/eplan-relaunch/de/en/services/onboarding-services

but other company may have other transformation pattern so we need to make it configurable.

Idea is that you will extend configuration so that user can put:
pattern with match groups:
/.*?eplan.com\/(..)-(..)\/(.*)/
and formatter string:
"/content/eplan-relaunch/$1/$2/$3"

Such transformation can be easily implemented using js 'replace' function:
url.replace(/.*?eplan.com\/(..)-(..)\/(.*)/,"/content/eplan-relaunch/$1/$2/$3")

there is already empty 'reverseMapping' function, change it as you need.

Also as regexp may by hard for humans, prepare ui for testing regexp and formatter string in options menu of other plugin.




