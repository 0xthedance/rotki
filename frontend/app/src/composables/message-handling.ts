import {
  type Notification,
  NotificationGroup,
  Severity
} from '@rotki/common/lib/messages';
import { useTxQueryStatusStore } from '@/store/history/query-status';
import { useSessionAuthStore } from '@/store/session/auth';
import {
  type BalanceSnapshotError,
  type EvmTransactionQueryData,
  MESSAGE_WARNING,
  type MigratedAddresses,
  type NewDetectedToken,
  type PremiumStatusUpdateData,
  SocketMessageType,
  WebsocketMessage
} from '@/types/websocket-messages';
import { axiosCamelCaseTransformer } from '@/services/axios-tranformers';
import { logger } from '@/utils/logging';
import { useNotificationsStore } from '@/store/notifications';
import { useNewlyDetectedTokens } from '@/composables/assets/newly-detected-tokens';
import { Routes } from '@/router/routes';
import router from '@/router';
import { useAccountMigrationStore } from '@/store/blockchain/accounts/migrate';

export const useMessageHandling = () => {
  const { setQueryStatus } = useTxQueryStatusStore();
  const { handleDbUpgradeStatus, handleDataMigrationStatus } =
    useSessionAuthStore();
  const notificationsStore = useNotificationsStore();
  const { data: notifications } = storeToRefs(notificationsStore);
  const { notify } = notificationsStore;
  const { addNewDetectedToken } = useNewlyDetectedTokens();
  const { tc } = useI18n();

  const handleSnapshotError = (data: BalanceSnapshotError): Notification => {
    return {
      title: tc('notification_messages.snapshot_failed.title'),
      message: tc('notification_messages.snapshot_failed.message', 0, data),
      display: true
    };
  };

  const handleEthereumTransactionStatus = (
    data: EvmTransactionQueryData
  ): void => {
    setQueryStatus(data);
  };

  const handleLegacyMessage = (
    message: string,
    isWarning: boolean
  ): Notification => {
    return {
      title: tc('notification_messages.backend.title'),
      message,
      display: !isWarning,
      severity: isWarning ? Severity.WARNING : Severity.ERROR
    };
  };

  const handlePremiumStatusUpdate = (
    data: PremiumStatusUpdateData
  ): Notification | null => {
    const { isPremiumActive: active, expired } = data;
    const premium = usePremium();
    const isPremium = get(premium);

    set(premium, active);
    if (active && !isPremium) {
      return {
        title: tc('notification_messages.premium.active.title'),
        message: tc('notification_messages.premium.active.message'),
        display: true,
        severity: Severity.INFO
      };
    } else if (!active && isPremium) {
      return {
        title: tc('notification_messages.premium.inactive.title'),
        message: expired
          ? tc('notification_messages.premium.inactive.expired_message')
          : tc(
              'notification_messages.premium.inactive.network_problem_message'
            ),
        display: true,
        severity: Severity.ERROR
      };
    }

    return null;
  };

  const { upgradeMigratedAddresses } = useAccountMigrationStore();

  const handleMigratedAccounts = (data: MigratedAddresses) => {
    upgradeMigratedAddresses(data);
  };

  const handleNewTokenDetectedMessage = (
    data: NewDetectedToken
  ): Notification => {
    const notification = get(notifications).find(
      ({ group }) => group === NotificationGroup.NEW_DETECTED_TOKENS
    );

    addNewDetectedToken(data);

    const count = (notification?.groupCount || 0) + 1;

    return {
      title: tc('notification_messages.new_detected_token.title', count),
      message: tc('notification_messages.new_detected_token.message', count, {
        identifier: data.tokenIdentifier,
        count
      }),
      display: true,
      severity: Severity.INFO,
      action: {
        label: tc('notification_messages.new_detected_token.action'),
        action: () => router.push(Routes.ASSET_MANAGER_NEWLY_DETECTED)
      },
      group: NotificationGroup.NEW_DETECTED_TOKENS,
      groupCount: count
    };
  };

  const handleMessage = async (data: string): Promise<void> => {
    const message: WebsocketMessage = WebsocketMessage.parse(
      axiosCamelCaseTransformer(JSON.parse(data))
    );
    const type = message.type;

    const notifications: Notification[] = [];

    if (type === SocketMessageType.BALANCES_SNAPSHOT_ERROR) {
      notifications.push(handleSnapshotError(message.data));
    } else if (type === SocketMessageType.LEGACY) {
      const data = message.data;
      const isWarning = data.verbosity === MESSAGE_WARNING;
      notifications.push(handleLegacyMessage(data.value, isWarning));
    } else if (type === SocketMessageType.EVM_TRANSACTION_STATUS) {
      handleEthereumTransactionStatus(message.data);
    } else if (type === SocketMessageType.PREMIUM_STATUS_UPDATE) {
      const notification = handlePremiumStatusUpdate(message.data);
      if (notification) {
        notifications.push(notification);
      }
    } else if (type === SocketMessageType.DB_UPGRADE_STATUS) {
      handleDbUpgradeStatus(message.data);
    } else if (type === SocketMessageType.DATA_MIGRATION_STATUS) {
      handleDataMigrationStatus(message.data);
    } else if (type === SocketMessageType.EVM_ADDRESS_MIGRATION) {
      handleMigratedAccounts(message.data);
    } else if (type === SocketMessageType.NEW_EVM_TOKEN_DETECTED) {
      notifications.push(handleNewTokenDetectedMessage(message.data));
    } else {
      logger.warn(`Unsupported socket message received: '${type}'`);
    }

    notifications.forEach(notify);
  };

  const handlePollingMessage = async (message: string, isWarning: boolean) => {
    const notifications: Notification[] = [];

    try {
      const object = JSON.parse(message);
      if (!object.type) {
        notifications.push(handleLegacyMessage(message, isWarning));
      } else if (object.type === SocketMessageType.BALANCES_SNAPSHOT_ERROR) {
        notifications.push(handleSnapshotError(object));
      } else if (object.type === SocketMessageType.EVM_TRANSACTION_STATUS) {
        await handleEthereumTransactionStatus(object);
      } else if (object.type === SocketMessageType.DB_UPGRADE_STATUS) {
        await handleDbUpgradeStatus(object);
      } else if (object.type === SocketMessageType.DATA_MIGRATION_STATUS) {
        await handleDataMigrationStatus(object);
      } else {
        logger.error('unsupported message:', message);
      }
    } catch {
      notifications.push(handleLegacyMessage(message, isWarning));
    }
    notifications.forEach(notify);
  };

  return {
    handleMessage,
    handlePollingMessage
  };
};