import { Button } from '@components/UI/Button';
import { Modal } from '@components/UI/Modal';
import { Spinner } from '@components/UI/Spinner';
import { WarningMessage } from '@components/UI/WarningMessage';
import { ExclamationIcon, MinusIcon, PlusIcon } from '@heroicons/react/outline';
import { Analytics } from '@lib/analytics';
import { getModule } from '@lib/getModule';
import onError from '@lib/onError';
import { t, Trans } from '@lingui/macro';
import type { ApprovedAllowanceAmount } from 'lens';
import { useGenerateModuleCurrencyApprovalDataLazyQuery } from 'lens';
import type { Dispatch, FC } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSendTransaction, useWaitForTransaction } from 'wagmi';

interface Props {
  title?: string;
  module: ApprovedAllowanceAmount;
  allowed: boolean;
  setAllowed: Dispatch<boolean>;
}

const AllowanceButton: FC<Props> = ({ title = t`Allow`, module, allowed, setAllowed }) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [generateAllowanceQuery, { loading: queryLoading }] =
    useGenerateModuleCurrencyApprovalDataLazyQuery();

  const {
    data: txData,
    isLoading: transactionLoading,
    sendTransaction
  } = useSendTransaction({
    request: {},
    mode: 'recklesslyUnprepared',
    onError
  });

  const { isLoading: waitLoading } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: () => {
      toast.success(t`Module ${allowed ? 'disabled' : 'enabled'} successfully!`);
      setShowWarningModal(false);
      setAllowed(!allowed);
      Analytics.track(`module_${allowed ? 'disabled' : 'enabled'}`);
    },
    onError
  });

  const handleAllowance = (currencies: string, value: string, selectedModule: string) => {
    generateAllowanceQuery({
      variables: {
        request: {
          currency: currencies,
          value: value,
          [getModule(module.module).field]: selectedModule
        }
      }
    }).then((res) => {
      const data = res?.data?.generateModuleCurrencyApprovalData;
      sendTransaction?.({
        recklesslySetUnpreparedRequest: {
          from: data?.from,
          to: data?.to,
          data: data?.data
        }
      });
    });
  };

  return allowed ? (
    <Button
      variant="warning"
      icon={
        queryLoading || transactionLoading || waitLoading ? (
          <Spinner variant="warning" size="xs" />
        ) : (
          <MinusIcon className="h-4 w-4" />
        )
      }
      onClick={() => handleAllowance(module.currency, '0', module.module)}
    >
      <Trans>Revoke</Trans>
    </Button>
  ) : (
    <>
      <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowWarningModal(!showWarningModal)}>
        {title}
      </Button>
      <Modal
        title={t`Warning`}
        icon={<ExclamationIcon className="h-5 w-5 text-yellow-500" />}
        show={showWarningModal}
        onClose={() => setShowWarningModal(false)}
      >
        <div className="space-y-3 p-5">
          <WarningMessage
            title={t`Handle with care!`}
            message={
              <div className="leading-6">
                <Trans>
                  Please be aware that by allowing this module, the amount indicated will be automatically
                  deducted when you <b>collect</b> and <b>super follow</b>.
                </Trans>
              </div>
            }
          />
          <Button
            icon={
              queryLoading || transactionLoading || waitLoading ? (
                <Spinner size="xs" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )
            }
            onClick={() =>
              handleAllowance(module.currency, Number.MAX_SAFE_INTEGER.toString(), module.module)
            }
          >
            {title}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default AllowanceButton;
