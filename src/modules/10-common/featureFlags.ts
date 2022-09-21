/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export enum FeatureFlag {
  CDNG_ENABLED = 'CDNG_ENABLED',
  CVNG_ENABLED = 'CVNG_ENABLED',
  CING_ENABLED = 'CING_ENABLED',
  CENG_ENABLED = 'CENG_ENABLED',
  CFNG_ENABLED = 'CFNG_ENABLED',
  CHAOS_ENABLED = 'CHAOS_ENABLED',
  SCM_ENABLED = 'SCM_ENABLED',
  SECURITY = 'SECURITY',
  SECURITY_STAGE = 'SECURITY_STAGE',
  NG_DASHBOARDS = 'NG_DASHBOARDS',
  CUSTOM_DASHBOARD_V2 = 'CUSTOM_DASHBOARD_V2',
  CI_OVERVIEW_PAGE = 'CI_OVERVIEW_PAGE',
  TI_CALLGRAPH = 'TI_CALLGRAPH',
  NG_LICENSES_ENABLED = 'NG_LICENSES_ENABLED',
  PLANS_ENABLED = 'PLANS_ENABLED',
  ARGO_PHASE1 = 'ARGO_PHASE1',
  ARGO_PHASE2_MANAGED = 'ARGO_PHASE2_MANAGED',
  FF_GITSYNC = 'FF_GITSYNC',
  FF_PIPELINE = 'FF_PIPELINE',
  FFM_1512 = 'FFM_1512',
  FFM_1513 = 'FFM_1513', // development only flag for epic https://harness.atlassian.net/browse/FFM-1513,
  FFM_1827 = 'FFM_1827',
  FEATURE_ENFORCEMENT_ENABLED = 'FEATURE_ENFORCEMENT_ENABLED',
  FREE_PLAN_ENFORCEMENT_ENABLED = 'FREE_PLAN_ENFORCEMENT_ENABLED',
  OPA_PIPELINE_GOVERNANCE = 'OPA_PIPELINE_GOVERNANCE',
  OPA_FF_GOVERNANCE = 'OPA_FF_GOVERNANCE',
  STO_CD_PIPELINE_SECURITY = 'STO_CD_PIPELINE_SECURITY',
  STO_CI_PIPELINE_SECURITY = 'STO_CI_PIPELINE_SECURITY',
  STO_API_V2 = 'STO_API_V2',
  SHOW_NG_REFINER_FEEDBACK = 'SHOW_NG_REFINER_FEEDBACK',
  FREE_PLAN_ENABLED = 'FREE_PLAN_ENABLED',
  VIEW_USAGE_ENABLED = 'VIEW_USAGE_ENABLED',
  RESOURCE_CENTER_ENABLED = 'RESOURCE_CENTER_ENABLED',
  CI_VM_INFRASTRUCTURE = 'CI_VM_INFRASTRUCTURE',
  FFM_1859 = 'FFM_1859', // development only flag for epic https://harness.atlassian.net/browse/FFM-1638,
  CHI_CUSTOM_HEALTH = 'CHI_CUSTOM_HEALTH',
  CHI_CUSTOM_HEALTH_LOGS = 'CHI_CUSTOM_HEALTH_LOGS',
  ERROR_TRACKING_ENABLED = 'ERROR_TRACKING_ENABLED',
  DISABLE_HARNESS_SM = 'DISABLE_HARNESS_SM',
  DYNATRACE_APM_ENABLED = 'DYNATRACE_APM_ENABLED',
  GIT_SYNC_WITH_BITBUCKET = 'GIT_SYNC_WITH_BITBUCKET',
  TEST_INTELLIGENCE = 'TEST_INTELLIGENCE',
  CCM_DEV_TEST = 'CCM_DEV_TEST',
  CUSTOM_ARTIFACT_NG = 'CUSTOM_ARTIFACT_NG',
  NG_GOOGLE_ARTIFACT_REGISTRY = 'NG_GOOGLE_ARTIFACT_REGISTRY',
  USE_OLD_GIT_SYNC = 'USE_OLD_GIT_SYNC',
  NG_TEMPLATE_GITX = 'NG_TEMPLATE_GITX',
  NG_TEMPLATE_GITX_ACCOUNT_ORG = 'NG_TEMPLATE_GITX_ACCOUNT_ORG',
  CCM_AS_DRY_RUN = 'CCM_AS_DRY_RUN',
  OPA_CONNECTOR_GOVERNANCE = 'OPA_CONNECTOR_GOVERNANCE',
  CCM_SUSTAINABILITY = 'CCM_SUSTAINABILITY',
  NG_FILE_STORE = 'NG_FILE_STORE',
  ENV_GROUP = 'ENV_GROUP',
  NG_SVC_ENV_REDESIGN = 'NG_SVC_ENV_REDESIGN',
  SSH_NG = 'SSH_NG',
  EXPORT_TF_PLAN_JSON_NG = 'EXPORT_TF_PLAN_JSON_NG',
  CVNG_TEMPLATE_VERIFY_STEP = 'CVNG_TEMPLATE_VERIFY_STEP',
  STALE_FLAGS_FFM_1510 = 'STALE_FLAGS_FFM_1510',
  FFM_3938_STALE_FLAGS_ACTIVE_CARD_HIDE_SHOW = 'FFM_3938_STALE_FLAGS_ACTIVE_CARD_HIDE_SHOW',
  FFM_4117_INTEGRATE_SRM = 'FFM_4117_INTEGRATE_SRM',
  NG_EXECUTION_INPUT = 'NG_EXECUTION_INPUT',
  TI_DOTNET = 'TI_DOTNET',
  CVNG_TEMPLATE_MONITORED_SERVICE = 'CVNG_TEMPLATE_MONITORED_SERVICE',
  ACCOUNT_BASIC_ROLE = 'ACCOUNT_BASIC_ROLE',
  SRM_LICENSE_ENABLED = 'SRM_LICENSE_ENABLED',
  OPA_SECRET_GOVERNANCE = 'OPA_SECRET_GOVERNANCE',
  JDK11_UPGRADE_BANNER = 'JDK11_UPGRADE_BANNER',
  CVNG_SPLUNK_METRICS = 'CVNG_SPLUNK_METRICS',
  AZURE_WEBAPP_NG = 'AZURE_WEBAPP_NG',
  CCM_MICRO_FRONTEND = 'CCM_MICRO_FRONTEND',
  FFM_2134_FF_PIPELINES_TRIGGER = 'FFM_2134_FF_PIPELINES_TRIGGER',
  SERVICE_DASHBOARD_V2 = 'SERVICE_DASHBOARD_V2',
  CUSTOM_SECRET_MANAGER_NG = 'CUSTOM_SECRET_MANAGER_NG',
  GITOPS_BYO_ARGO = 'GITOPS_BYO_ARGO',
  SELF_SERVICE_ENABLED = 'SELF_SERVICE_ENABLED',
  TEMPLATE_SCHEMA_VALIDATION = 'TEMPLATE_SCHEMA_VALIDATION',
  ATTRIBUTE_TYPE_ACL_ENABLED = 'ATTRIBUTE_TYPE_ACL_ENABLED',
  EARLY_ACCESS_ENABLED = 'EARLY_ACCESS_ENABLED',
  ECS_NG = 'ECS_NG',
  NG_SETTINGS = 'NG_SETTINGS',
  HOSTED_BUILDS = 'HOSTED_BUILDS',
  NG_OPTIMIZE_FETCH_FILES_KUSTOMIZE = 'NG_OPTIMIZE_FETCH_FILES_KUSTOMIZE',
  CVNG_METRIC_THRESHOLD = 'CVNG_METRIC_THRESHOLD',
  CD_ONBOARDING_ENABLED = 'CD_ONBOARDING_ENABLED',
  NG_ENABLE_LDAP_CHECK = 'NG_ENABLE_LDAP_CHECK',
  NG_CUSTOM_REMOTE_MANIFEST = 'NG_CUSTOM_REMOTE_MANIFEST',
  CCM_COMMORCH = 'CCM_COMMORCH',
  NG_SERVICE_MANIFEST_OVERRIDE = 'NG_SERVICE_MANIFEST_OVERRIDE',
  NG_SERVICE_CONFIG_FILES_OVERRIDE = 'NG_SERVICE_CONFIG_FILES_OVERRIDE',
  NG_ARTIFACT_SOURCES = 'NG_ARTIFACT_SOURCES',
  TRIGGERS_REFACTOR = 'TRIGGERS_REFACTOR',
  GIT_WEBHOOK_POLLING = 'GIT_WEBHOOK_POLLING',
  CIE_HOSTED_VMS = 'CIE_HOSTED_VMS',
  ALLOW_USER_TYPE_FIELDS_JIRA = 'ALLOW_USER_TYPE_FIELDS_JIRA',
  USE_IMMUTABLE_DELEGATE = 'USE_IMMUTABLE_DELEGATE',
  NG_DEPLOYMENT_TEMPLATE = 'NG_DEPLOYMENT_TEMPLATE',
  AUTO_FREE_MODULE_LICENSE = 'AUTO_FREE_MODULE_LICENSE',
  CREATE_DEFAULT_PROJECT = 'CREATE_DEFAULT_PROJECT',
  MULTI_SERVICE_INFRA = 'MULTI_SERVICE_INFRA',
  ELK_HEALTH_SOURCE = 'ELK_HEALTH_SOURCE',
  GITHUB_PACKAGES = 'GITHUB_PACKAGES',
  AZURE_WEBAPP_NG_S3_ARTIFACTS = 'AZURE_WEBAPP_NG_S3_ARTIFACTS',
  ENABLE_VERIFY_STEP_LONG_DURATION = 'ENABLE_VERIFY_STEP_LONG_DURATION'
}
