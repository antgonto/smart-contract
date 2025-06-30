import React, { useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import axios from "axios";

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const actions = [
    {
      id: 'compile-contracts',
      title: 'Compile Contracts',
      url: '/app/v1/smartcontracts/compile/',
      successMsg: 'Success: the contracts were successfully compiled.',
      errorMsg: 'Failed to compile the contracts: ',
      iconType: 'indexRuntime',
    },
    {
      id: 'deploy-contracts',
      title: 'Deploy Contracts',
      url: '/app/v1/smartcontracts/deploy/',
      successMsg: 'Success: the contracts were successfully deployed.',
      errorMsg: 'Failed to to deploy the contracts: ',
      iconType: 'launch',
    },
    // {
    //   id: 'execute-fill-tables',
    //   title: 'Execute Fill Tables Procedure',
    //   url: '/app/v1/cyber/settings/execute_fake_data_procedure/',
    //   successMsg: 'Executed procedure to fill the tables.',
    //   errorMsg: 'Failed to execute the procedure to fill the tables: ',
    //   iconType: 'playFilled',
    // },
    // {
    //   id: 'stamps-last-updated',
    //   title: 'Create Trigger to Change Last_Updated in Threat Intelligence',
    //   url: '/app/v1/cyber/settings/create_threat_update_trigger/',
    //   successMsg: 'Created trigger to update last_updated date.',
    //   errorMsg: 'Failed to create trigger to update last_updated date: ',
    //   iconType: 'calendar',
    // },
    // {
    //   id: 'stamps-last-updated',
    //   title: 'Create Trigger to Change Last_Updated - Associations',
    //   url: '/app/v1/cyber/settings/create_assoc_touch_triggers/',
    //   successMsg: 'Created trigger that initiates updates to last_updated date from threat associations.',
    //   errorMsg: 'Failed to create trigger that initiates updates to last_updated date from threat associations: ',
    //   iconType: 'bolt',
    // },
    // {
    //   id: 'create-dashboard',
    //   title: 'Create Dashboard View',
    //   url: '/app/v1/cyber/dashboard/create_view/',
    //   successMsg: 'Dashboard View created successfully.',
    //   errorMsg: 'Failed to create the dashboard view: ',
    //   iconType: 'dashboardApp',
    // },
    // {
    //   id: 'create-risk-dashboard',
    //   title: 'Create Function to Calculate Risk Score',
    //   url: '/app/v1/cyber/risk/create_risk_score_function/',
    //   successMsg: 'Function to calculate risk score was created successfully.',
    //   errorMsg: 'Failed to create the function to calculate risk score: ',
    //   iconType: 'consoleApp',
    // },
    // {
    //   id: 'create-truncate',
    //   title: 'Create Truncate Procedure',
    //   url: '/app/v1/cyber/settings/create_truncate_procedure/',
    //   successMsg: 'Truncate procedure created.',
    //   errorMsg: 'Failed to create the procedure: ',
    //   iconType: 'eraser',
    // },
    // {
    //   id: 'execute-truncate',
    //   title: 'Execute Truncate Procedure',
    //   url: '/app/v1/cyber/settings/execute_truncate_procedure/',
    //   successMsg: 'Truncate procedure executed.',
    //   errorMsg: 'Failed to execute the procedure: ',
    //   iconType: 'play',
    // },
    // {
    //   id: 'drop-db',
    //   title: 'Drop Database',
    //   url: '/app/v1/cyber/settings/drop_database/',
    //   successMsg: 'Database dropped.',
    //   errorMsg: 'Failed to drop the database: ',
    //   iconType: 'trash',
    // },
];

// 5 columns x 4 rows = 20 tiles total
const GRID_SIZE = 3 * 4;

const SettingsMenu: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleAction = async (action: typeof actions[0]) => {
    try {
      console.log("url", action.url);
      const response = await api.post(action.url);
      const data = response.data;
      alert(data.detail || action.successMsg);
      setSelected(prev =>
        prev.includes(action.id)
          ? prev.filter(id => id !== action.id)
          : [...prev, action.id]
      );
    } catch (error) {
      alert(action.errorMsg + error);
    }
  };

  const blankCount = GRID_SIZE - actions.length;

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiFlexGrid columns={4} gutterSize="l">
        {actions.map(action => (
          <EuiFlexItem key={action.id} style={{ minHeight: 150 }}>
            <EuiCard
              icon={<EuiIcon type={action.iconType} size="xxl" />}
              title={action.title}
              textAlign="center"
              paddingSize="l"
              selectable={{
                isSelected: selected.includes(action.id),
                onClick: () => handleAction(action),
              }}
            />
          </EuiFlexItem>
        ))}

        {Array.from({ length: blankCount }).map((_, idx) => (
          <EuiFlexItem key={`blank-${idx}`} style={{ minHeight: 150 }}>
            {/* empty space */}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
};

export default SettingsMenu;
