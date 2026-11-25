import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';
import styles from './Crosstabs.module.css';

/** Saved crosstab configurations (localStorage), at the foot of the rail. */
export default function TabPlansPanel({
  plans,
  activePlanId,
  onSelect,
  onDelete,
}) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <>
      <h3 className={`${styles.railTitle} ${styles.railTitleGap}`}>
        {t('crosstabs.saved_plans', 'Saved tab plans')}
      </h3>
      <div className={styles.railBody}>
        {plans.length === 0 ? (
          <p className={styles.noPlans}>
            {t('crosstabs.no_plans', 'No saved plans yet.')}
          </p>
        ) : (
          <ul className={styles.plans}>
            {plans.map((plan) => {
              const on = plan.id === activePlanId;
              return (
                <li
                  key={plan.id}
                  className={`${styles.plan} ${on ? styles.planOn : ''}`}
                >
                  {/* dir=auto: a long name is cut at its own end, so its
                      start stays visible in either language. */}
                  <button
                    type="button"
                    dir="auto"
                    className={styles.planOpen}
                    aria-current={on ? 'true' : undefined}
                    title={plan.name}
                    onClick={() => onSelect(plan)}
                  >
                    {plan.name}
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={t('crosstabs.delete_plan', { name: plan.name })}
                    onClick={() => onDelete(plan.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
