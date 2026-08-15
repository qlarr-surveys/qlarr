
import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import Image from '~/components/image/image';
import CompactLayout from '~/layouts/compact';
import { NAMESPACES } from '~/hooks/useNamespaceLoader';


export default function UnsupportedView() {
    const { t } = useTranslation(NAMESPACES.MANAGE);
    return (
        <CompactLayout>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h4" paragraph>
                    {t("mobile_view")}
                </Typography>

                <Typography sx={{ color: 'text.secondary', mb: 4 }}>
                    {t("mobile_view_working")}
                </Typography>
            </Box>
        </CompactLayout>
    );
}
