/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

export enum PermissionIdentifier {
  CREATE_PROJECT = 'core_project_create',
  UPDATE_PROJECT = 'core_project_edit',
  DELETE_PROJECT = 'core_project_delete',
  VIEW_PROJECT = 'core_project_view',
  UPDATE_SECRET = 'core_secret_edit',
  DELETE_SECRET = 'core_secret_delete',
  VIEW_SECRET = 'core_secret_view',
  ACCESS_SECRET = 'core_secret_access',
  CREATE_ORG = 'core_organization_create',
  UPDATE_ORG = 'core_organization_edit',
  DELETE_ORG = 'core_organization_delete',
  VIEW_ORG = 'core_organization_view',
  UPDATE_CONNECTOR = 'core_connector_edit',
  DELETE_CONNECTOR = 'core_connector_delete',
  VIEW_CONNECTOR = 'core_connector_view',
  ACCESS_CONNECTOR = 'core_connector_access',
  VIEW_PIPELINE = 'core_pipeline_view',
  EDIT_PIPELINE = 'core_pipeline_edit',
  DELETE_PIPELINE = 'core_pipeline_delete',
  EXECUTE_PIPELINE = 'core_pipeline_execute',
  VIEW_SERVICE = 'core_service_view',
  EDIT_SERVICE = 'core_service_edit',
  DELETE_SERVICE = 'core_service_delete',
  RUNTIMEACCESS_SERVICE = 'core_service_access',
  VIEW_ENVIRONMENT = 'core_environment_view',
  EDIT_ENVIRONMENT = 'core_environment_edit',
  DELETE_ENVIRONMENT = 'core_environment_delete',
  RUNTIMEACCESS_ENVIRONMENT = 'core_environment_access',
  VIEW_ENVIRONMENT_GROUP = 'core_environmentgroup_view',
  EDIT_ENVIRONMENT_GROUP = 'core_environmentgroup_edit',
  DELETE_ENVIRONMENT_GROUP = 'core_environmentgroup_delete',
  RUNTIMEACCESS_ENVIRONMENT_GROUP = 'core_environmentgroup_access',
  VIEW_USERGROUP = 'core_usergroup_view',
  MANAGE_USERGROUP = 'core_usergroup_manage',
  VIEW_USER = 'core_user_view',
  MANAGE_USER = 'core_user_manage',
  INVITE_USER = 'core_user_invite',
  VIEW_SERVICEACCOUNT = 'core_serviceaccount_view',
  EDIT_SERVICEACCOUNT = 'core_serviceaccount_edit',
  DELETE_SERVICEACCOUNT = 'core_serviceaccount_delete',
  MANAGE_SERVICEACCOUNT = 'core_serviceaccount_manageapikey',
  EDIT_ACCOUNT = 'core_account_edit',
  VIEW_ACCOUNT = 'core_account_view',
  VIEW_ROLE = 'core_role_view',
  UPDATE_ROLE = 'core_role_edit',
  DELETE_ROLE = 'core_role_delete',
  VIEW_RESOURCEGROUP = 'core_resourcegroup_view',
  UPDATE_RESOURCEGROUP = 'core_resourcegroup_edit',
  DELETE_RESOURCEGROUP = 'core_resourcegroup_delete',
  VIEW_AUTHSETTING = 'core_authsetting_view',
  EDIT_AUTHSETTING = 'core_authsetting_edit',
  DELETE_AUTHSETTING = 'core_authsetting_delete',
  UPDATE_DELEGATE = 'core_delegate_edit',
  DELETE_DELEGATE = 'core_delegate_delete',
  VIEW_DELEGATE = 'core_delegate_view',
  UPDATE_DELEGATE_CONFIGURATION = 'core_delegateconfiguration_edit',
  DELETE_DELEGATE_CONFIGURATION = 'core_delegateconfiguration_delete',
  VIEW_DELEGATE_CONFIGURATION = 'core_delegateconfiguration_view',
  EDIT_VARIABLE = 'core_variable_edit',
  DELETE_VARIABLE = 'core_variable_delete',
  VIEW_VARIABLE = 'core_variable_view',
  ACCESS_VARIABLE = 'core_variable_access',
  EDIT_FILE = 'core_file_edit',
  DELETE_FILE = 'core_file_delete',
  VIEW_FILE = 'core_file_view',
  ACCESS_FILE = 'core_file_access',

  // FEATURE FLAG PERMISSIONS
  DELETE_FF_FEATUREFLAG = 'ff_featureflag_delete',
  EDIT_FF_FEATUREFLAG = 'ff_featureflag_edit',
  TOGGLE_FF_FEATUREFLAG = 'ff_featureflag_toggle',
  DELETE_FF_TARGETGROUP = 'ff_targetgroup_delete',
  EDIT_FF_TARGETGROUP = 'ff_targetgroup_edit',

  // Dashboard Permissions
  VIEW_DASHBOARD = 'core_dashboards_view',
  EDIT_DASHBOARD = 'core_dashboards_edit',

  // GITOPS
  ADD_NEW_PROVIDER = 'ff_add_new_provider',

  // Template Permissions
  VIEW_TEMPLATE = 'core_template_view',
  EDIT_TEMPLATE = 'core_template_edit',
  DELETE_TEMPLATE = 'core_template_delete',
  ACCESS_TEMPLATE = 'core_template_access',

  // CHANGE INTELLIGENCE Permissions
  EDIT_MONITORED_SERVICE = 'chi_monitoredservice_edit',
  VIEW_MONITORED_SERVICE = 'chi_monitoredservice_view',
  DELETE_MONITORED_SERVICE = 'chi_monitoredservice_delete',
  TOGGLE_MONITORED_SERVICE = 'chi_monitoredservice_toggle',
  VIEW_SLO_SERVICE = 'chi_slo_view',
  EDIT_SLO_SERVICE = 'chi_slo_edit',
  DELETE_SLO_SERVICE = 'chi_slo_delete',

  // Governance Permissions
  GOV_VIEW_POLICY = 'core_governancePolicy_view',
  GOV_EDIT_POLICY = 'core_governancePolicy_edit',
  GOV_DELETE_POLICY = 'core_governancePolicy_delete',
  GOV_VIEW_POLICYSET = 'core_governancePolicySets_view',
  GOV_EDIT_POLICYSET = 'core_governancePolicySets_edit',
  GOV_DELETE_POLICYSET = 'core_governancePolicySets_delete',
  GOV_EVALUATE_POLICYSET = 'core_governancePolicySets_evaluate',

  // GitOps Permissions
  VIEW_GITOPS_AGENT = 'gitops_agent_view',
  EDIT_GITOPS_AGENT = 'gitops_agent_edit',
  DELETE_GITOPS_AGENT = 'gitops_agent_delete',
  VIEW_GITOPS_APPLICATION = 'gitops_application_view',
  EDIT_GITOPS_APPLICATION = 'gitops_application_edit',
  DELETE_GITOPS_APPLICATION = 'gitops_application_delete',
  SYNC_GITOPS_APPLICATION = 'gitops_application_sync',
  OVERRIDE_GITOPS_APPLICATION = 'gitops_application_override',
  VIEW_GITOPS_REPOSITORY = 'gitops_repository_view',
  EDIT_GITOPS_REPOSITORY = 'gitops_repository_edit',
  DELETE_GITOPS_REPOSITORY = 'gitops_repository_delete',
  VIEW_GITOPS_CLUSTER = 'gitops_cluster_view',
  EDIT_GITOPS_CLUSTER = 'gitops_cluster_edit',
  DELETE_GITOPS_CLUSTER = 'gitops_cluster_delete',
  VIEW_GITOPS_GPGKEY = 'gitops_gpgkey_view',
  EDIT_GITOPS_GPGKEY = 'gitops_gpgkey_edit',
  DELETE_GITOPS_GPGKEY = 'gitops_gpgkey_delete',
  VIEW_GITOPS_CERT = 'gitops_cert_view',
  EDIT_GITOPS_CERT = 'gitops_cert_edit',
  DELETE_GITOPS_CERT = 'gitops_cert_delete',

  // Chaos Permissions
  VIEW_CHAOS_HUB = 'chaos_chaoshub_view',
  EDIT_CHAOS_HUB = 'chaos_chaoshub_edit',
  DELETE_CHAOS_HUB = 'chaos_chaoshub_delete',
  VIEW_CHAOS_SCENARIO = 'chaos_chaosworkflow_view',
  EDIT_CHAOS_SCENARIO = 'chaos_chaosworkflow_edit',
  DELETE_CHAOS_SCENARIO = 'chaos_chaosworkflow_delete',
  VIEW_CHAOS_DELEGATE = 'chaos_chaosagent_view',
  EDIT_CHAOS_DELEGATE = 'chaos_chaosagent_edit',
  DELETE_CHAOS_DELEGATE = 'chaos_chaosagent_delete',
  VIEW_CHAOS_GITOPS = 'chaos_chaosgitops_view',
  EDIT_CHAOS_GITOPS = 'chaos_chaosgitops_edit',

  // STO Permissions
  VIEW_STO_ISSUE = 'sto_issue_view',
  VIEW_STO_SCAN = 'sto_scan_view',
  VIEW_STO_TESTTARGET = 'sto_testtarget_view',
  EDIT_STO_TESTTARGET = 'sto_testtarget_edit',
  VIEW_STO_EXEMPTION = 'sto_exemption_view',
  CREATE_STO_EXEMPTION = 'sto_exemption_create',
  APPROVE_STO_EXEMPTION = 'sto_exemption_approve',

  // Default Settings
  VIEW_CORE_SETTING = 'core_setting_view',
  EDIT_CORE_SETTING = 'core_setting_edit',
  // CCM Permissions
  VIEW_CCM_OVERVIEW = 'ccm_overview_view',
  VIEW_CCM_PERSPECTIVE_FOLDERS = 'ccm_folder_view',
  EDIT_CCM_PERSPECTIVE_FOLDERS = 'ccm_folder_edit',
  DELETE_CCM_PERSPECTIVE_FOLDERS = 'ccm_folder_delete',
  VIEW_CCM_PERSPECTIVE = 'ccm_perspective_view',
  EDIT_CCM_PERSPECTIVE = 'ccm_perspective_edit',
  DELETE_CCM_PERSPECTIVE = 'ccm_perspective_delete',
  VIEW_CCM_BUDGET = 'ccm_budget_view',
  EDIT_CCM_BUDGET = 'ccm_budget_edit',
  DELETE_CCM_BUDGET = 'ccm_budget_delete',
  VIEW_CCM_COST_CATEGORY = 'ccm_costCategory_view',
  EDIT_CCM_COST_CATEGORY = 'ccm_costCategory_edit',
  DELETE_CCM_COST_CATEGORY = 'ccm_costCategory_delete',
  VIEW_CCM_AUTOSTOPPING_RULE = 'ccm_autoStoppingRule_view',
  EDIT_CCM_AUTOSTOPPING_RULE = 'ccm_autoStoppingRule_edit',
  DELETE_CCM_AUTOSTOPPING_RULE = 'ccm_autoStoppingRule_delete',
  VIEW_CCM_LOADBALANCER = 'ccm_loadBalancer_view',
  EDIT_CCM_LOADBALANCER = 'ccm_loadBalancer_edit',
  DELETE_CCM_LOADBALANCER = 'ccm_loadBalancer_delete',
  // Billing Permissions
  EDIT_LICENSE = 'core_license_edit',
  DELETE_LICENSE = 'core_license_delete',
  VIEW_LICENSE = 'core_license_view'
}
