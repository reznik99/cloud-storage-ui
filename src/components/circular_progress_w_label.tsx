import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { sizePercentageToColor } from '../utilities/utils';

type IProps = {
    value: number;
    size: number;
    color?: 'error' | 'info' | 'success' | 'warning' | 'primary' | 'inherit' | 'secondary';
};

function CircularProgressWithLabel(props: IProps) {
    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box sx={boxStyle}>
                <CircularProgress size={props.size} variant="determinate" value={100} sx={{ color: '#333' }} />
            </Box>
            <Box sx={boxStyle}>
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                    {`${props.value}%`}
                </Typography>
            </Box>
            <CircularProgress
                size={props.size}
                variant="determinate"
                color={props.color || sizePercentageToColor(props.value)}
                value={props.value}
            />
        </Box>
    );
}

const boxStyle = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

export default CircularProgressWithLabel;
