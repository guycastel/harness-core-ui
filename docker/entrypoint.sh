#!/bin/bash
# Copyright 2022 Harness Inc. All rights reserved.
# Use of this source code is governed by the PolyForm Shield 1.0.0 license
# that can be found in the licenses directory at the root of this repository, also available at
# https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.

NGINX_CONFIG_FILE="/etc/nginx/nginx.conf"

if [[ "$ENABLE_IPV6" == "true" ]]
then
  NGINX_CONFIG_FILE="/etc/nginx/nginx-ipv6-only.conf"
fi

sed -i "s|<\!-- apiurl -->|<script>window.apiUrl = '$API_URL'</script>|" index.html
sed -i "s|<\!-- IDPUrl -->|<script>window.IDPUrl = '$IDP_URL'</script>|" index.html
sed -i "s|HARNESS_ENABLE_NG_AUTH_UI_PLACEHOLDER|$HARNESS_ENABLE_NG_AUTH_UI_PLACEHOLDER|" index.html
sed -i "s|HARNESS_NO_AUTH_HEADER|$HARNESS_NO_AUTH_HEADER|" index.html
sed -i "s|HARNESS_ENABLE_APPDY_EUM_PLACEHOLDER|$HARNESS_ENABLE_APPDY_EUM_PLACEHOLDER|" index.html
sed -i "s|HARNESS_ENABLE_CDN_PLACEHOLDER|$HARNESS_ENABLE_CDN_PLACEHOLDER|" index.html
sed -i "s|HARNESS_ENABLE_CANNY_PLACEHOLDER|$CANNY_ENABLE|" index.html
sed -i "s|<\!-- segmentToken -->|<script>window.segmentToken = '$SEGMENT_TOKEN'</script>|" index.html
sed -i "s|<\!-- bugsnagToken -->|<script>window.bugsnagToken = '$BUGSNAG_TOKEN'</script>|" index.html
sed -i "s|<\!-- appDyEUMToken -->|<script>window.appDyEUMToken = '$APPDY_EUM_TOKEN'</script>|" index.html
sed -i "s|<\!-- deploymentType -->|<script>window.deploymentType = '$DEPLOYMENT_TYPE'</script>|" index.html
sed -i "s|<\!-- refinerProjectToken -->|<script>window.refinerProjectToken = '$REFINER_PROJECT_TOKEN'</script>|" index.html
sed -i "s|<\!-- refinerFeedbackToken -->|<script>window.refinerFeedbackToken = '$REFINER_FEEDBACK_TOKEN'</script>|" index.html
sed -i "s|<\!-- helpPanelAccessToken -->|<script>window.helpPanelAccessToken = '$HELP_PANEL_ACCESS_TOKEN'</script>|" index.html
sed -i "s|<\!-- helpPanelSpace -->|<script>window.helpPanelSpace = '$HELP_PANEL_SPACE'</script>|" index.html
sed -i "s|<\!-- helpPanelEnvironment -->|<script>window.helpPanelEnvironment = '$HELP_PANEL_ENVIRONMENT'</script>|" index.html
sed -i "s|<\!-- newNavContentfulAccessToken -->|<script>window.newNavContentfulAccessToken = '$NEW_NAV_CONTENTFUL_ACCESS_TOKEN'</script>|" index.html
sed -i "s|<\!-- newNavContetfulSpace -->|<script>window.newNavContetfulSpace = '$NEW_NAV_CONTENTFUL_SPACE'</script>|" index.html
sed -i "s|<\!-- newNavContentfulEnvironment -->|<script>window.newNavContentfulEnvironment = '$NEW_NAV_CONTENTFUL_ENVIRONMENT'</script>|" index.html
sed -i "s|<\!-- harnessNameSpacePlaceHolder -->|<script>window.harnessNameSpace = '$HARNESS_NAME_SPACE'</script>|" index.html
sed -i "s|<\!-- harnessClusterURLPlaceHolder -->|<script>window.harnessClusterURL = '$HARNESS_CLUSTER_URL'</script>|" index.html
sed -i "s|<\!-- stripeApiKey -->|<script>window.stripeApiKey = '$STRIPE_API_KEY'</script>|" index.html
sed -i "s|<\!-- cannyAppId -->|<script>window.cannyAppId = '$CANNY_APP_ID'</script>|" index.html
sed -i "s|<\!-- releaseNotesLink -->|<script>window.releaseNotesLink = '$RELEASE_NOTES_LINK'</script>|" index.html
sed -i "s|<\!-- sscaPathPrefix -->|<script>window.sscaPathPrefix = '$SSCA_PATH_PREFIX'</script>|" index.html
sed -i "s|<\!-- downtimeStatusEndpoint -->|<script>window.downtimeStatusEndpoint = '$DOWNTIME_STATUS_ENDPOINT'</script>|" index.html

sed -i "s|USE_LEGACY_FEATURE_FLAGS_PLACEHOLDER|$USE_LEGACY_FEATURE_FLAGS|" index.html
sed -i "s|HARNESS_FF_SDK_BASE_URL_PLACEHOLDER|$HARNESS_FF_SDK_BASE_URL|" index.html
sed -i "s|HARNESS_FF_SDK_EVENT_URL_PLACEHOLDER|$HARNESS_FF_SDK_EVENT_URL|" index.html
sed -i "s|HARNESS_FF_SDK_ENABLE_STREAM_PLACEHOLDER|$HARNESS_FF_SDK_ENABLE_STREAM|" index.html
sed -i "s|HARNESS_FF_SDK_ASYNC_PLACEHOLDER|$HARNESS_FF_SDK_ASYNC|" index.html
sed -i "s|HARNESS_FF_SDK_CACHE_PLACEHOLDER|$HARNESS_FF_SDK_CACHE|" index.html
sed -i "s|HARNESS_FF_SDK_KEY_PLACEHOLDER|$HARNESS_FF_SDK_KEY|" index.html
sed -i "s|HARNESS_PLG_FF_SDK_KEY_PLACEHOLDER|$HARNESS_PLG_FF_SDK_KEY|" index.html

HARNESS_NAME_SPACE_URL=""
# Check if the $HARNESS_NAME_SPACE is not empty or undefined
if [ ! -z "$HARNESS_NAME_SPACE" ]
then
  HARNESS_NAME_SPACE_URL="/$HARNESS_NAME_SPACE"
fi

if [ "$HARNESS_ENABLE_CSP_HEADERS" = "true" ]
then
  sed -i "s|#cspHeadersPlaceholder|add_header Content-Security-Policy-Report-Only \"script-src 'self' 'unsafe-inline' https://canny.io https://*.harness.io https://cdn.segment.com https://js.refiner.io https://widget.intercom.io https://js.intercomcdn.com https://d2wy8f7a9ursnm.cloudfront.net https://cdn.appdynamics.com; style-src 'self' 'unsafe-inline' https://*.harness.io https://fonts.googleapis.com https://js.refiner.io; img-src 'self' data: blob: https://*.harness.io; font-src 'self' https://fonts.gstatic.com;\";|" $NGINX_CONFIG_FILE
fi


if [ "$HARNESS_ENABLE_CDN_PLACEHOLDER" = "true" ]
then
  sed -i "s|\"static\/main\.\(.*\)\.js\"|\"//static.harness.io/ng-static/main.\1.js\"|" index.html
  sed -i "s|\"static\/styles\.\(.*\)\.css\"|\"//static.harness.io/ng-static/styles.\1.css\"|" index.html
else
  sed -i "s|\"static\/main\.\(.*\)\.js\"|\"$HARNESS_NAME_SPACE_URL/ng/static/main.\1.js\"|" index.html
  sed -i "s|\"static\/styles\.\(.*\)\.css\"|\"$HARNESS_NAME_SPACE_URL/ng/static/styles.\1.css\"|" index.html
fi

if [ "$DEPLOYMENT_TYPE" != "ON_PREM" ]
then
  sed -i "s|<\!-- externalFilesForSaaS -->|<link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600\&display=swap' rel='stylesheet' />\n<link href='https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;700\&display=swap' rel='stylesheet' />\n<link href='https://fonts.googleapis.com/css2?family=Reenie+Beanie\&display=swap' rel='stylesheet' />\n<link id='favicon-x-icon' rel='icon' type='image/x-icon' href='https://static.harness.io/ng-static/images/favicon.ico' />\n<link id='favicon-png' rel='icon' type='image/png' href='https://static.harness.io/ng-static/images/favicon.png' />\n<link id='favicon-apple-touch' rel='apple-touch-icon' href='https://static.harness.io/ng-static/images/favicon.png' />|" index.html
  sed -i "s|<\!-- externalLoaderForSaaS -->|<img src='https://static.harness.io/ng-static/images/loader.gif' alt='Loading...' />|" index.html
else
  sed -i "s|<\!-- externalFilesForSaaS -->|<link id='favicon-x-icon' rel='icon' type='image/x-icon' href='/ng/static/favicon.ico' />\n<link id='favicon-png' rel='icon' type='image/png' href='/ng/static/favicon.png' />\n<link id='favicon-apple-touch' rel='apple-touch-icon' href='/ng/static/favicon.png' />|" index.html
  sed -i "s|<\!-- externalLoaderForSaaS -->|<img src='/ng/static/loader.gif' alt='Loading...' />|" index.html
fi

echo "Using $NGINX_CONFIG_FILE for nginx"
nginx -c $NGINX_CONFIG_FILE -g 'daemon off;'
